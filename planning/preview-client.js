import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';

const SUPABASE_URL='https://xnlzsgulskqyecfgzhwa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
const PLAN_KEY='olano-editorial-v10';
const BUSINESS_ID='48182e1a-06d5-4685-9627-7891d7aafacb';
const live=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});

export async function resolveContentContext(){return {negocioId:BUSINESS_ID,negocio:{nombre:'Dr. Olano · vista pública'},canEdit:false,preview:true}}

export const sb={from(table){
 if(table==='content_planes_editoriales'){
  const q={select(){return q},eq(){return q},order(){return q},range(){return q},async maybeSingle(){
   const {data,error}=await live.from('content_planes_editoriales').select('id,negocio_id,plan_key,document,revision,updated_at').eq('negocio_id',BUSINESS_ID).eq('plan_key',PLAN_KEY).maybeSingle();
   return {data,error};
  },then(resolve,reject){return q.maybeSingle().then(resolve,reject)}};
  return q;
 }
 const empty={select(){return empty},eq(){return empty},order(){return empty},range(){return empty},maybeSingle(){return Promise.resolve({data:null,error:null})},then(resolve){return Promise.resolve({data:[],error:null}).then(resolve)}};
 return empty;
}};
