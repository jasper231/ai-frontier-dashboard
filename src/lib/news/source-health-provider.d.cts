export interface SourceHealth {schemaVersion:1;checkedAt:string|null;summary:{total:number;enabled:number;healthy:number;warnings:number;failed:number;blocked:number;pending:number;disabled:number};sources:unknown[];events:unknown[]}
export function loadHealth():SourceHealth;
