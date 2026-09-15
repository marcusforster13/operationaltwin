import * as THREE from 'three';
import type {DroneTelemetry} from '../../types/domain';
import {disposeObject} from '../../utils/three/dispose';
export class VisionVisual{
 readonly group=new THREE.Group();
 constructor(length:number){const spread=length*.45;const p=[new THREE.Vector3(),new THREE.Vector3(-spread,-spread*.6,-length),new THREE.Vector3(spread,-spread*.6,-length),new THREE.Vector3(spread,spread*.6,-length),new THREE.Vector3(-spread,spread*.6,-length)];const vertices:number[]=[];for(const [a,b] of [[0,1],[0,2],[0,3],[0,4],[1,2],[2,3],[3,4],[4,1]])vertices.push(...p[a].toArray(),...p[b].toArray());const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));this.group.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x75e8ac,transparent:true,opacity:.8,depthTest:false})));this.group.visible=false;}
 update(frame:DroneTelemetry|null,enabled:boolean,yaw:number,pitch:number){this.group.visible=enabled&&!!frame;if(!frame)return;this.group.position.copy(frame.position);const h=((frame.heading??0)+yaw)*Math.PI/180,p=pitch*Math.PI/180;const direction=new THREE.Vector3(Math.sin(h)*Math.cos(p),Math.sin(p),-Math.cos(h)*Math.cos(p));this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),direction);}
 dispose(){disposeObject(this.group);}
}
