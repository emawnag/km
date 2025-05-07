// main.js
// 處理圖片選擇與顯示分析結果

document.getElementById('fileInput').addEventListener('change', handleFiles);

function handleFiles(e) {
  const files = Array.from(e.target.files);
  const imageList = document.getElementById('imageList');
  imageList.innerHTML = '';
  files.forEach(file => {
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
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
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
  // 顯示
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
