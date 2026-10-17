export function renderResolution(cssWidth=1280,pixelRatio=1,quality='high'){
 const width=Number.isFinite(cssWidth)&&cssWidth>0?cssWidth:1280;
 const ratio=Number.isFinite(pixelRatio)&&pixelRatio>0?Math.min(3,pixelRatio):1;
 const pixels=quality==='balanced'?1280:Math.max(1280,Math.min(3840,Math.round(width*ratio)));
 return {width:pixels,height:Math.round(pixels*720/1280)};
}
