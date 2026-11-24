-- BondiSupport QA: restore support notification on new Ciguena QA tickets.
-- Source: existing public.support_ciguena_qa_ingest definition exported 2026-11-24.
-- Only removed the outbox DELETE and its two explanatory comments.
-- No explicit transaction wrapper. Execute the entire CREATE OR REPLACE FUNCTION.

CREATE OR REPLACE FUNCTION public.support_ciguena_qa_ingest(p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
 v_source_id uuid; v_tenant_id uuid; v_ticket_id uuid; v_code text; v_status text;
 v_app_id uuid; v_client_id uuid; v_type text; v_priority text;
 v_reporter text; v_description text; v_title text; v_request_type text;
BEGIN
 IF COALESCE(auth.role(),'') <> 'service_role' THEN
   RAISE EXCEPTION 'No autorizado' USING ERRCODE='42501';
 END IF;
 IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' THEN
   RAISE EXCEPTION 'Datos invalidos';
 END IF;
 v_source_id := (p_data->>'external_request_id')::uuid;
 v_tenant_id := (p_data->>'tenant_id')::uuid;
 v_request_type := p_data->>'request_type';
 IF v_request_type NOT IN ('problem','suggestion') THEN
   RAISE EXCEPTION 'Tipo de reporte invalido';
 END IF;
 v_reporter := btrim(COALESCE(p_data->>'contact_name',''));
 v_description := btrim(COALESCE(p_data->>'description',''));
 IF length(v_reporter) NOT BETWEEN 1 AND 120 OR length(v_description) NOT BETWEEN 1 AND 4000 THEN
   RAISE EXCEPTION 'Nombre o descripcion invalidos';
 END IF;
 v_type := CASE WHEN v_request_type='suggestion' THEN 'mejora' ELSE 'problema' END;
 v_priority := CASE p_data->>'priority'
   WHEN 'urgent' THEN 'critica' WHEN 'high' THEN 'alta'
   WHEN 'medium' THEN 'media' WHEN 'low' THEN 'baja' ELSE 'media' END;
 v_title := CASE WHEN v_request_type='suggestion' THEN 'Sugerencia Cigüeña QA: ' ELSE 'Reporte Cigüeña QA: ' END
    || left(regexp_replace(v_description, E'[\\n\\r]+', ' ', 'g'),100);
 PERFORM pg_advisory_xact_lock(hashtext('ciguena_qa'),hashtext(v_source_id::text));
 SELECT l.ticket_id INTO v_ticket_id FROM public.support_ciguena_qa_links l
 WHERE l.external_request_id=v_source_id;
 IF v_ticket_id IS NOT NULL THEN
   SELECT t.code,t.status INTO v_code,v_status FROM public.tickets t WHERE t.id=v_ticket_id;
   RETURN jsonb_build_object('created',false,'ticket_id',v_ticket_id,'code',v_code,'status',v_status);
 END IF;
 SELECT a.id,a.client_id INTO v_app_id,v_client_id FROM public.applications a
 WHERE a.slug='ciguena-qa' AND a.status='activo';
 IF v_app_id IS NULL THEN RAISE EXCEPTION 'Cigüeña QA no habilitada'; END IF;
 INSERT INTO public.tickets(application_id,client_id,title,description,type,priority,status,
    section,origin_path,reporter_name,custom_fields)
 VALUES(v_app_id,v_client_id,v_title,v_description,v_type,v_priority,'nuevo',
   'Soporte Cigüeña QA','Cigüeña QA',v_reporter,
   jsonb_build_object('origin','ciguena-qa','external_request_id',v_source_id,
                      'tenant_id',v_tenant_id,'environment','QA'))
 RETURNING id,code,status INTO v_ticket_id,v_code,v_status;
 INSERT INTO public.support_ciguena_qa_links(external_request_id,tenant_id,ticket_id)
 VALUES(v_source_id,v_tenant_id,v_ticket_id);
 INSERT INTO public.ticket_events(ticket_id,event_type,description,actor_name)
 VALUES(v_ticket_id,'creacion','Ticket recibido desde Cigüeña QA',v_reporter);
 RETURN jsonb_build_object('created',true,'ticket_id',v_ticket_id,'code',v_code,'status',v_status);
END; $function$;
