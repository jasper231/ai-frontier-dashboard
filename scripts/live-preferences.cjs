/* DOM interaction helper embedded into the downloaded-page browser check. */
function choosePreference(doc,kind,value){
 const allowed={theme:['light','dark','system'],language:['en','zh','auto']};
 if(!allowed[kind]?.includes(value))throw new Error('Invalid verification preference');
 const menu=doc.querySelector('[data-preference="'+kind+'"]');
 const summary=menu?.querySelector('summary');
 if(!summary)throw new Error('Missing native '+kind+' menu');
 if(!menu.open)summary.click();
 if(!menu.open)throw new Error('Native '+kind+' menu did not open');
 // Scope to the menu and require a button: html[data-theme] is never a control.
 const button=menu.querySelector('button[data-'+kind+'="'+value+'"]');
 if(!button||button.tagName!=='BUTTON')throw new Error('Missing native '+kind+' button: '+value);
 button.click();
 return {kind,value,target:'BUTTON',menuOpened:true};
}
module.exports={choosePreference};
