import assert from 'node:assert/strict';
import {renderResolution} from './dist/render-resolution.js';
import {Renderer} from './dist/renderer.js';

for(const [width,dpr,quality,expected] of [[1280,1,'high',1280],[1920,1,'high',1920],[1440,2,'high',2880],[3840,2,'high',3840],[390,3,'high',1280],[1920,2,'balanced',1280]]){
 const size=renderResolution(width,dpr,quality);assert.equal(size.width,expected);assert.equal(size.height,Math.round(expected*720/1280));assert.ok(size.width*size.height<=3840*2160);
}
console.log('PASS graphics resolution follows display density, supports Balanced, and caps allocations at 4K');
for(const [width,ratio] of [[0,0],[-20,-2],[NaN,NaN],[Infinity,Infinity],[1e8,1e8]]){
 const size=renderResolution(width,ratio);assert.ok(Number.isFinite(size.width)&&Number.isFinite(size.height));assert.ok(size.width>=1280&&size.width<=3840);
}
console.log('PASS graphics sizing handles hidden canvases and invalid display values safely');
const calls=[],ctx={setTransform:(...args)=>calls.push(args)},renderer=Object.create(Renderer.prototype);renderer.ctx=ctx;renderer.densityX=3;renderer.densityY=3;
renderer.setTransform(ctx,.75,0,0,.75,-150,-90);assert.deepEqual(calls.pop(),[2.25,0,0,2.25,-450,-270]);renderer.setTransform(ctx,1,0,0,1,0,0);assert.deepEqual(calls.pop(),[3,0,0,3,0,0]);
const background={setTransform:(...args)=>calls.push(args)};renderer.setTransform(background,1,0,0,1,20,30);assert.deepEqual(calls.pop(),[1,0,0,1,20,30]);
console.log('PASS camera and screen transforms scale together while cached background coordinates stay unchanged');
console.log('3 graphics test groups passed.');
