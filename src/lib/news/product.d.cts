import type {NewsBatch,NewsItem,CategoryDefinition,DashboardView,View} from './types';
export const mainViews:View[];
export function trends(batch:NewsBatch,archive:unknown,asOf:string):NewsItem[];
export function completeZh(item:NewsItem):boolean;
export function createModel(batch:NewsBatch,definitions:CategoryDefinition[],view:View,asOf:string,archive:unknown):DashboardView;
export function readLocation(location?:{hash:string}):{view:View;editionDate?:string};
export function writeLocation(env:Window,view:View,editionDate?:string):void;

export function briefingStatus(archive:unknown,asOf:string,editionDate?:string):{editionDate:string|null;latestDate:string|null;todayPublished:boolean};
