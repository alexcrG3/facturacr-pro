import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://vxinvcjbrmjytmqqcscg.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables de entorno");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function handleGetAdminUsers(): Promise<Response> {
  try {
    const supabase = getAdminSupabase();

    const [authRes, profRes, estRes] = await Promise.all([
      supabase.auth.admin.listUsers({ perPage: 100 }),
      supabase.from("profiles").select("*"),
      supabase.from("establishments").select("id, name, code, legal_id"),
    ]);

    if (authRes.error) throw authRes.error;

    const profiles = profRes.data || [];
    const establishments = estRes.data || [];

    const users = (authRes.data?.users || []).map((u) => {
      const prof = profiles.find((p: any) => p.id === u.id);
      const allowed: string[] =
        u.user_metadata?.allowed_establishment_ids ||
        (prof?.establishment_id ? [prof.establishment_id] : []);

      return {
        id: u.id,
        email: u.email || "",
        fullName: prof?.full_name || u.user_metadata?.full_name || u.email?.split("@")[0] || "Usuario",
        role: prof?.role || u.user_metadata?.role || "admin",
        establishmentId: prof?.establishment_id || u.user_metadata?.establishment_id || null,
        allowedEstablishmentIds: allowed,
        createdAt: u.created_at,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        users,
        establishments,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error al obtener usuarios para admin:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Error al obtener usuarios" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function handleAssignEstablishments(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { userId, allowedEstablishmentIds, primaryEstablishmentId, role } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "El userId es requerido" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = getAdminSupabase();

    const ids: string[] = Array.isArray(allowedEstablishmentIds) ? allowedEstablishmentIds : [];
    const primaryId = primaryEstablishmentId || (ids.length > 0 ? ids[0] : null);

    // 1. Actualizar metadata en auth.users
    const updatePayload: any = {
      user_metadata: {
        allowed_establishment_ids: ids,
        establishment_id: primaryId,
      },
    };
    if (role) {
      updatePayload.user_metadata.role = role;
    }

    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, updatePayload);
    if (authErr) throw authErr;

    // 2. Actualizar registro en profiles
    const profPayload: any = {
      establishment_id: primaryId,
      updated_at: new Date().toISOString(),
    };
    if (role) {
      profPayload.role = role;
    }

    const { error: profErr } = await supabase
      .from("profiles")
      .update(profPayload)
      .eq("id", userId);

    if (profErr) {
      console.warn("Advertencia al actualizar profiles:", profErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Sociedades autorizadas actualizadas con éxito",
        userId,
        allowedEstablishmentIds: ids,
        primaryEstablishmentId: primaryId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error al asignar sociedades al usuario:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Error al asignar sociedades" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
