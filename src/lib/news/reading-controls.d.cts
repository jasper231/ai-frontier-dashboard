export interface ReadingControls {refresh():void;reveal():void;dispose():void}
export function attach(root:HTMLElement,env:Window):ReadingControls;
