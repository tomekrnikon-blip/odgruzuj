import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordChangeCodeRequest {
  email: string;
}

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client to verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User authentication failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email }: PasswordChangeCodeRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify email matches authenticated user
    if (user.email !== email) {
      console.error("Email mismatch - requested:", email, "user:", user.email);
      return new Response(
        JSON.stringify({ error: "Email mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    console.log("[PASSWORD-CHANGE-CODE] Sending verification code to:", email);
    console.log("[PASSWORD-CHANGE-CODE] Generated code:", verificationCode);

    // Note: Using onboarding@resend.dev as sender because odgruzuj.pl domain is not verified in Resend
    // To send from noreply@odgruzuj.pl, domain must be verified at https://resend.com/domains
    const emailResponse = await resend.emails.send({
      from: "Odgruzuj <onboarding@resend.dev>",
      to: [email],
      subject: "Kod weryfikacyjny zmiany hasła - odgruzuj.pl",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .logo { text-align: center; margin-bottom: 30px; }
            .logo h1 { color: #22c55e; margin: 0; font-size: 28px; }
            .code { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
            .code span { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #15803d; }
            .info { color: #666; font-size: 14px; text-align: center; }
            .warning { color: #dc2626; font-size: 12px; text-align: center; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h1>🧹 odgruzuj.pl</h1>
            </div>
            <p style="text-align: center; color: #333;">Twój kod weryfikacyjny do zmiany hasła:</p>
            <div class="code">
              <span>${verificationCode}</span>
            </div>
            <p class="info">Kod jest ważny przez 10 minut.</p>
            <p class="warning">Jeśli nie prosiłeś o zmianę hasła, zignoruj ten email.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[PASSWORD-CHANGE-CODE] Resend API response:", JSON.stringify(emailResponse));

    if (emailResponse.error) {
      console.error("[PASSWORD-CHANGE-CODE] Failed to send email:", JSON.stringify(emailResponse.error));
      return new Response(
        JSON.stringify({ error: "Failed to send verification email", details: emailResponse.error }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[PASSWORD-CHANGE-CODE] Email sent successfully, id:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        code: verificationCode,
        expiresAt: expiresAt.toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-password-change-code function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
