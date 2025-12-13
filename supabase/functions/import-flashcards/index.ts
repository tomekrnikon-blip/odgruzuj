import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Flashcard data from JSON
const flashcardsData = [
  {
    "id": 1,
    "task": "Wyrzuć 3 skarpetki bez pary",
    "categories": ["Garderoba", "Błyskawiczne"],
    "difficulty": "łatwy",
    "timeEstimate": 5,
    "comment": "Samotne skarpetki to smutne skarpetki. Daj im spokój i pozwól im odejść w parze... do kosza."
  }
  // This will be replaced with full data
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the flashcards from request body
    const { flashcards } = await req.json();
    
    if (!flashcards || !Array.isArray(flashcards)) {
      return new Response(
        JSON.stringify({ error: "Invalid flashcards data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map difficulty values
    const mapDifficulty = (diff: string) => {
      switch (diff.toLowerCase()) {
        case "łatwy": return "easy";
        case "średni": return "medium";
        case "trudny": return "hard";
        default: return "medium";
      }
    };

    // First, delete all existing flashcards
    const { error: deleteError } = await supabase
      .from("global_flashcards")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (deleteError) {
      console.error("Delete error:", deleteError);
    }

    // Prepare flashcards for insertion
    const flashcardsToInsert = flashcards.map((fc: any) => ({
      category: fc.categories[0],
      category2: fc.categories.length > 1 ? fc.categories[1] : null,
      task: fc.task,
      comment: fc.comment,
      difficulty: mapDifficulty(fc.difficulty),
      time_estimate: fc.timeEstimate,
      time_unit: "minutes",
      is_timed_task: true,
      is_premium: false, // All cards will be free initially, admin can set premium later
    }));

    // Insert in batches of 100
    const batchSize = 100;
    let insertedCount = 0;
    
    for (let i = 0; i < flashcardsToInsert.length; i += batchSize) {
      const batch = flashcardsToInsert.slice(i, i + batchSize);
      const { error: insertError, data } = await supabase
        .from("global_flashcards")
        .insert(batch);

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: `Insert error at batch ${i / batchSize}: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      insertedCount += batch.length;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Imported ${insertedCount} flashcards successfully` 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});