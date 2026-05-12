import { supaQuery } from './supabase';

/**
 * KnowledgeService — The 'Self-Learning' engine of CityLink.
 * This service allows the AI to persist successful interactions and new intent mappings
 * to evolve the platform's intelligence over time.
 */
export const KnowledgeService = {
  /**
   * logNewPattern — Records a new way of asking for something or a new local insight.
   * In a production environment, this would go to a 'Knowledge Buffer' table in Supabase
   * for periodic review or automated RAG indexing.
   */
  logNewPattern: async (intent: string, example: string, language: 'en' | 'am') => {
    console.log(`[KnowledgeService] Learning new pattern: ${intent} -> ${example}`);
    
    // For now, we persist this to a dedicated table in Supabase.
    // This allows the CTO/Admin to review and promote these to the core SKILL.md.
    return supaQuery((c) =>
      c.from('ai_knowledge_buffer').insert({
        intent,
        example_phrase: example,
        language,
        status: 'pending_review',
        created_at: new Date().toISOString()
      })
    );
  },

  /**
   * getCommunityInsights — Fetches top-voted or approved local knowledge.
   * This can be injected into the AI's context to make it 'locally smart'.
   */
  getCommunityInsights: async () => {
    const { data } = await supaQuery((c) =>
      c.from('ai_knowledge_buffer')
        .select('*')
        .eq('status', 'approved')
        .limit(10)
    );
    return data || [];
  }
};
