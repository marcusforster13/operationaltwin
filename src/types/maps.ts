export type Vec3 = {x:number;y:number;z:number};
export type OperationalMap = {
 id:string; name:string; city:string; state:string; description:string; sourceFile:string; modelUrl:string;
 status:'source_georef_detected'|'maintenance'|'unavailable';
 transform:{scale:number;rotationY:number;position:Vec3}; initialCamera:{position:Vec3;target:Vec3}|null;
 geo:{sourceGeorefDetected:boolean;fieldCalibrated:boolean;origin:{lat:number;lon:number};bounds:{minLat:number;maxLat:number;minLon:number;maxLon:number};sourceHeightOffset:number;altitudeReferenceValidated:boolean;metersPerUnit:number|null;northRotationY:number|null;altitudeDatum:string|null};
};
