// kmeans.js
// 簡單的k-means聚類算法，僅用於色彩分析
function kmeans(pixels, k, maxIter = 10) {
  // pixels: [{r,g,b}, ...]
  // k: 分群數
  // 返回: [{r,g,b, count} ...]
  if (pixels.length === 0) return [];
  // 隨機初始化中心
  let centers = [];
  for (let i = 0; i < k; i++) {
    centers.push({...pixels[Math.floor(Math.random() * pixels.length)]});
  }
  let assignments = new Array(pixels.length);
  for (let iter = 0; iter < maxIter; iter++) {
    // 分配每個像素到最近中心
    for (let i = 0; i < pixels.length; i++) {
      let minDist = Infinity, idx = 0;
      for (let j = 0; j < k; j++) {
        let d = dist(pixels[i], centers[j]);
        if (d < minDist) {
          minDist = d;
          idx = j;
        }
      }
      assignments[i] = idx;
    }
    // 更新中心
    let sums = Array.from({length: k}, () => ({r:0,g:0,b:0,count:0}));
    for (let i = 0; i < pixels.length; i++) {
      let c = assignments[i];
      sums[c].r += pixels[i].r;
      sums[c].g += pixels[i].g;
      sums[c].b += pixels[i].b;
      sums[c].count++;
    }
    for (let j = 0; j < k; j++) {
      if (sums[j].count > 0) {
        centers[j] = {
          r: Math.round(sums[j].r / sums[j].count),
          g: Math.round(sums[j].g / sums[j].count),
          b: Math.round(sums[j].b / sums[j].count)
        };
      }
    }
  }
  // 統計每個中心的像素數
  let counts = Array(k).fill(0);
  for (let i = 0; i < assignments.length; i++) counts[assignments[i]]++;
  return centers.map((c, i) => ({...c, count: counts[i]}));
}
function dist(a, b) {
  return (a.r-b.r)**2 + (a.g-b.g)**2 + (a.b-b.b)**2;
}
function rgb2hex(r,g,b) {
  return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function isWhiteOrBlack({r,g,b}) {
  // 純白或純黑
  return (r>245&&g>245&&b>245)||(r<10&&g<10&&b<10);
}
