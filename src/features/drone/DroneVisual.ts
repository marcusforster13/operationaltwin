import * as THREE from 'three';
import type {DroneTelemetry} from '../../types/domain';
import type {Vec3} from '../../types/maps';
import {disposeObject} from '../../utils/three/dispose';
export class DroneVisual{
 readonly group=new THREE.Group();private drone=new THREE.Group();private trail:THREE.Line;private points=new Float32Array(30000);
 constructor(size:number){const material=new THREE.MeshBasicMaterial({color:0xffc86a,depthTest:false});for(const angle of [Math.PI/4,-Math.PI/4]){const arm=new THREE.Mesh(new THREE.BoxGeometry(size*1.8,size*.18,size*.18),material);arm.rotation.y=angle;this.drone.add(arm);}const nose=new THREE.Mesh(new THREE.ConeGeometry(size*.3,size*.8,4),material);nose.rotation.x=-Math.PI/2;nose.position.z=-size*.8;this.drone.add(nose);this.group.add(this.drone);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.points,3));geometry.setDrawRange(0,0);this.trail=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xffbd5e,depthTest:false}));this.group.add(this.trail);this.drone.visible=false;}
 update(frame:DroneTelemetry|null,trail:Vec3[]){this.drone.visible=!!frame;if(frame){this.drone.position.copy(frame.position);this.drone.rotation.y=-(frame.heading??0)*Math.PI/180;}const count=Math.min(trail.length,10000),offset=trail.length-count;for(let i=0;i<count;i++){this.points[i*3]=trail[offset+i].x;this.points[i*3+1]=trail[offset+i].y;this.points[i*3+2]=trail[offset+i].z;}this.trail.geometry.attributes.position.needsUpdate=true;this.trail.geometry.setDrawRange(0,count);this.trail.frustumCulled=false;}
 dispose(){disposeObject(this.group);}
}
