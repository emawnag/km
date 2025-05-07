// main.js
// 處理圖片選擇與顯示分析結果

let selectedFiles = []; // Store selected files

document.getElementById('fileInput').addEventListener('change', handleFileSelection);
document.getElementById('clusterButton').addEventListener('click', processImages);

function handleFileSelection(e) {
  selectedFiles = Array.from(e.target.files);
  const imageList = document.getElementById('imageList');
  imageList.innerHTML = ''; // Clear previous results or messages
  if (selectedFiles.length > 0) {
    const fileNames = selectedFiles.map(f => f.name).join(', ');
    imageList.innerHTML = `已選擇 ${selectedFiles.length} 個檔案: ${fileNames}.<br>點擊 "分析色彩 (K-Means)" 按鈕開始處理。`;
  } else {
    imageList.innerHTML = '未選擇任何檔案。';
  }
}

function processImages() {
  const imageList = document.getElementById('imageList');
  imageList.innerHTML = ''; // Clear previous results or selection message

  if (selectedFiles.length === 0) {
    imageList.innerHTML = '請先選擇圖片檔案。';
    return;
  }

  selectedFiles.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = new window.Image();
      img.onload = function() {
        analyzeImage(img, file.name, imageList);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function analyzeImage(img, name, container) {
  // 建立canvas取得像素
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;

  // 取樣像素（每隔4像素）
  let pixels = [];
  for (let y = 0; y < img.height; y += 4) {
    for (let x = 0; x < img.width; x += 4) {
      let idx = (y * img.width + x) * 4;
      let r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
      if (a > 128) pixels.push({r,g,b});
    }
  }
  // 過濾純白/純黑
  pixels = pixels.filter(p => !isWhiteOrBlack(p));
  // kmeans分析
  let colors = kmeans(pixels, 10, 8);
  // 依出現次數排序
  colors = colors.filter(c => !isWhiteOrBlack(c)).sort((a,b)=>b.count-a.count).slice(0,10);

  // 顯示原圖與色塊
  const block = document.createElement('div');
  block.className = 'image-block';
  block.innerHTML = `<div><img src="${img.src}" alt="${name}"><div>${name}</div></div>`;
  const swatches = document.createElement('div');
  swatches.className = 'color-swatches';
  colors.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    const hex = rgb2hex(c.r,c.g,c.b);
    sw.title = `${hex} (${c.count})`;
    sw.style.background = hex;
    // 顯示hex code浮動提示
    sw.addEventListener('mouseenter', function(e) {
      showSwatchTooltip(sw, hex);
    });
    sw.addEventListener('mouseleave', function(e) {
      hideSwatchTooltip();
    });
    // 點擊複製 R G B (0~1 float)
    sw.addEventListener('click', function() {
      const r = (c.r/255).toFixed(4);
      const g = (c.g/255).toFixed(4);
      const b = (c.b/255).toFixed(4);
      const text = `${r} ${g} ${b}`;
      copyToClipboard(text);
      showSwatchTooltip(sw, '已複製: ' + text);
    });
    swatches.appendChild(sw);
  });
  block.appendChild(swatches);

  // --- 新版: 區塊平滑 segmented image ---
  const blockSize = 12; // 區塊大小，可調整
  let segImageData = ctx.createImageData(img.width, img.height);
  let segData = segImageData.data;
  for (let by = 0; by < img.height; by += blockSize) {
    for (let bx = 0; bx < img.width; bx += blockSize) {
      // 區塊內像素加總
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let y = by; y < by + blockSize && y < img.height; y++) {
        for (let x = bx; x < bx + blockSize && x < img.width; x++) {
          let idx = (y * img.width + x) * 4;
          let r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
          if (a > 128 && !isWhiteOrBlack({r,g,b})) {
            sumR += r; sumG += g; sumB += b; count++;
          }
        }
      }
      if (count === 0) continue;
      // 區塊平均色
      let avg = { r: Math.round(sumR/count), g: Math.round(sumG/count), b: Math.round(sumB/count) };
      // 找最近的主色
      let minDist = Infinity, idxColor = 0;
      for (let j = 0; j < colors.length; j++) {
        let d = dist(avg, colors[j]);
        if (d < minDist) { minDist = d; idxColor = j; }
      }
      let color = colors[idxColor];
      // 填滿區塊
      for (let y = by; y < by + blockSize && y < img.height; y++) {
        for (let x = bx; x < bx + blockSize && x < img.width; x++) {
          let idx = (y * img.width + x) * 4;
          let a = data[idx+3];
          if (a > 128 && !isWhiteOrBlack({r: data[idx], g: data[idx+1], b: data[idx+2]})) {
            segData[idx] = color.r;
            segData[idx+1] = color.g;
            segData[idx+2] = color.b;
            segData[idx+3] = a;
          } else {
            // 保持原透明/白黑
            segData[idx] = data[idx];
            segData[idx+1] = data[idx+1];
            segData[idx+2] = data[idx+2];
            segData[idx+3] = data[idx+3];
          }
        }
      }
    }
  }
  // 建立 segmented canvas
  const segCanvas = document.createElement('canvas');
  segCanvas.width = img.width;
  segCanvas.height = img.height;
  segCanvas.style.maxWidth = '200px';
  segCanvas.style.maxHeight = '120px';
  segCanvas.style.borderRadius = '4px';
  segCanvas.style.marginBottom = '1em';
  segCanvas.getContext('2d').putImageData(segImageData, 0, 0);
  // 顯示 segmented image
  const segDiv = document.createElement('div');
  segDiv.style.marginTop = '8px';
  segDiv.innerHTML = '<div style="font-size:13px;color:#888;">分割後的圖片 (Segmented Image)</div>';
  segDiv.appendChild(segCanvas);
  block.appendChild(segDiv);

  container.appendChild(block);
}

// --- 新增: 色塊tooltip與複製功能 ---
let swatchTooltip = null;
function showSwatchTooltip(target, text) {
  if (!swatchTooltip) {
    swatchTooltip = document.createElement('div');
    swatchTooltip.style.position = 'fixed';
    swatchTooltip.style.zIndex = 9999;
    swatchTooltip.style.background = '#222';
    swatchTooltip.style.color = '#fff';
    swatchTooltip.style.padding = '4px 10px';
    swatchTooltip.style.borderRadius = '4px';
    swatchTooltip.style.fontSize = '13px';
    swatchTooltip.style.pointerEvents = 'none';
    document.body.appendChild(swatchTooltip);
  }
  swatchTooltip.textContent = text;
  const rect = target.getBoundingClientRect();
  swatchTooltip.style.left = (rect.left + rect.width/2 - swatchTooltip.offsetWidth/2) + 'px';
  swatchTooltip.style.top = (rect.top - 32) + 'px';
  swatchTooltip.style.display = 'block';
}
function hideSwatchTooltip() {
  if (swatchTooltip) swatchTooltip.style.display = 'none';
}
function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
