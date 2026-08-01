REVOKE EXECUTE ON FUNCTION public.has_report_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_report_access(uuid) TO service_role;