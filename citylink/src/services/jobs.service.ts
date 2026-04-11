import { hasSupabase, supaQuery } from './supabase';

/**
 * fetchJobs — fetches all open job listings.
 */
export async function fetchJobs() {
  return supaQuery((c) =>
    c.from('job_listings').select('*,profiles(merchant_name,full_name)').eq('status', 'OPEN').order('created_at', { ascending: false })
  );
}

/**
 * applyForJob — submits a new job application.
 */
export async function applyForJob(application) {
  return supaQuery((c) => c.from('job_applications').insert(application).select().single());
}

/**
 * fetchMyApplications — fetches all applications submitted by a user.
 */
export async function fetchMyApplications(userId) {
  return supaQuery((c) =>
    c.from('job_applications').select('*,job_listings(title,merchant_id)').eq('applicant_id', userId)
  );
}

// ── Merchant/Employer Dashboard Functions ───────────────────────────────

/**
 * fetchJobListings — fetches jobs posted by a specific employer.
 */
export const fetchJobListings = async (employerId) => {
  if (!hasSupabase()) {
    return { 
      data: [
        { id: 'job1', employer_id: employerId, title: 'Software Developer', salary_range: '20,000-35,000 ETB', type: 'FULL_TIME', location: 'Bole, Addis Ababa', status: 'OPEN', created_at: new Date().toISOString() },
        { id: 'job2', employer_id: employerId, title: 'Marketing Manager', salary_range: '15,000-25,000 ETB', type: 'FULL_TIME', location: 'Kazanchis, Addis Ababa', status: 'OPEN', created_at: new Date(Date.now() - 86400000).toISOString() }
      ], 
      error: null 
    };
  }
  return supaQuery(client => 
    client.from('job_listings').select('*').eq('employer_id', employerId).order('created_at', { ascending: false })
  );
};

/**
 * fetchJobApplications — fetches applications received by an employer.
 */
export const fetchJobApplications = async (employerId) => {
  if (!hasSupabase()) {
    return { 
      data: [
        { id: 'app1', employer_id: employerId, job_title: 'Software Developer', applicant_name: 'Abebe Kebede', status: 'APPLIED', applied_at: new Date().toISOString(), cover_note: 'Experienced developer with 5+ years in React Native' },
        { id: 'app2', employer_id: employerId, job_title: 'Software Developer', applicant_name: 'Tigist Haile', status: 'REVIEWING', applied_at: new Date(Date.now() - 3600000).toISOString(), cover_note: 'Recent graduate with strong portfolio' }
      ], 
      error: null 
    };
  }
  return supaQuery(client => 
    client.from('job_applications').select('*').eq('employer_id', employerId).order('applied_at', { ascending: false })
  );
};

/**
 * updateApplicationStatus — updates the status of a job application.
 */
export const updateApplicationStatus = async (applicationId, status) => {
  if (!hasSupabase()) {
    return { ok: true, error: null };
  }
  return supaQuery(client => 
    client.from('job_applications').update({ status }).eq('id', applicationId)
  );
};

/**
 * createJobListing — posts a new job listing.
 */
export const createJobListing = async (job) => {
  if (!hasSupabase()) {
    return { ok: true, error: null };
  }
  return supaQuery(client => 
    client.from('job_listings').insert(job)
  );
};
