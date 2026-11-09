import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const achievementsQuery = queryOptions({
  queryKey: ["achievements"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .order("achieved_on", { ascending: false });
    if (error) throw error;
    return data;
  },
});
