import {sb as baseSb,resolveContentContext} from '../content-vault-client.js?v=20260917-vinculos';

const ACTIVE_PLAN_KEY='olano-editorial-v10';

function wrapBuilder(builder){
 return new Proxy(builder,{
  get(target,prop,receiver){
   const value=Reflect.get(target,prop,receiver);
   if(typeof value!=='function')return value;
   if(prop==='then')return value.bind(target);
   return (...args)=>{
    if(prop==='eq'&&args[0]==='plan_key'&&args[1]==='olano-editorial-v3')args[1]=ACTIVE_PLAN_KEY;
    const result=value.apply(target,args);
    return result&&typeof result==='object'&&typeof result.then==='function'?wrapBuilder(result):result;
   };
  }
 });
}

export const sb=new Proxy(baseSb,{
 get(target,prop,receiver){
  if(prop!=='from')return Reflect.get(target,prop,receiver);
  return table=>wrapBuilder(target.from(table));
 }
});

export {resolveContentContext};
