/**
 * Document Vault Service - Enhanced CV and Document Management
 * Handles document uploads, storage, and verification
 */

import { getClient } from './supabase';
import { Config } from '../config';
import { uid } from '../utils';

// ── Document Types ───────────────────────────────────────────────────────────────
export const DOCUMENT_TYPES = {
  national_id: { name: 'National ID', icon: 'card', required: true },
  passport: { name: 'Passport', icon: 'document-text', required: false },
  degree: { name: 'Degree Certificate', icon: 'school', required: false },
  diploma: { name: 'Diploma', icon: 'library', required: false },
  work_experience: { name: 'Work Experience', icon: 'briefcase', required: false },
  police_clearance: { name: 'Police Clearance', icon: 'shield-checkmark', required: false },
  medical_certificate: { name: 'Medical Certificate', icon: 'medical', required: false },
  reference_letter: { name: 'Reference Letter', icon: 'document', required: false },
  portfolio: { name: 'Portfolio', icon: 'images', required: false },
  other: { name: 'Other Document', icon: 'document-attach', required: false },
};

// ── Upload Document ─────────────────────────────────────────────────────────────
export async function uploadDocument(userId, docType, fileData, metadata = {}) {
  const client = getClient();
  if (!client) return { error: 'no-supabase' };

  try {
    // Upload file to Supabase Storage
    const fileName = `${userId}/${docType}/${uid()}-${fileData.name}`;
    const { data: uploadData, error: uploadError } = await client.storage
      .from('documents')
      .upload(fileName, fileData, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = client.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Create document record
    const document = {
      id: uid(),
      user_id: userId,
      type: docType,
      file_name: fileData.name,
      file_size: fileData.size,
      file_url: urlData.publicUrl,
      storage_path: fileName,
      status: 'UPLOADED',
      metadata: {
        ...metadata,
        uploaded_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('documents')
      .insert(document)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error uploading document:', error);
    return { error: error.message || 'Upload failed' };
  }
}

// ── Fetch User Documents ─────────────────────────────────────────────────────────
export async function fetchUserDocuments(userId) {
  return fetchDocumentsByFilter('user_id', userId);
}

// ── Fetch Documents by Filter ─────────────────────────────────────────────────────
export async function fetchDocumentsByFilter(field, value) {
  const client = getClient();
  if (!client) return { data: null, error: 'no-supabase' };

  try {
    const { data, error } = await client
      .from('documents')
      .select('*')
      .eq(field, value)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching documents:', error);
    return { data: null, error: error.message };
  }
}

// ── Delete Document ───────────────────────────────────────────────────────────────
export async function deleteDocument(documentId, userId) {
  const client = getClient();
  if (!client) return { error: 'no-supabase' };

  try {
    // Get document info first
    const { data: doc, error: fetchError } = await client
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    if (doc?.storage_path) {
      const { error: storageError } = await client.storage
        .from('documents')
        .remove([doc.storage_path]);

      if (storageError) console.warn('Storage deletion failed:', storageError);
    }

    // Delete from database
    const { error } = await client
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { error: error.message };
  }
}

// ── Update Document Status (for verification) ───────────────────────────────────────
export async function updateDocumentStatus(documentId, status, verifiedBy = null, notes = null) {
  const client = getClient();
  if (!client) return { error: 'no-supabase' };

  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (verifiedBy) updateData.verified_by = verifiedBy;
    if (notes) updateData.verification_notes = notes;

    const { data, error } = await client
      .from('documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating document status:', error);
    return { error: error.message };
  }
}

// ── Request Document from User (for employers/merchants) ─────────────────────────────
export async function requestDocument(fromUserId, toUserId, docType, message, jobId = null) {
  const client = getClient();
  if (!client) return { error: 'no-supabase' };

  try {
    const request = {
      id: uid(),
      from_user_id: fromUserId,
      to_user_id: toUserId,
      document_type: docType,
      message,
      job_id: jobId,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('document_requests')
      .insert(request)
      .select()
      .single();

    if (error) throw error;

    // Create notification for recipient
    await client
      .from('notifications')
      .insert({
        id: uid(),
        user_id: toUserId,
        title: 'Document Request',
        message: `Document requested: ${DOCUMENT_TYPES[docType]?.name || docType}`,
        type: 'document_request',
        data: { request_id: request.id, doc_type: docType },
        created_at: new Date().toISOString(),
      });

    return { data, error: null };
  } catch (error) {
    console.error('Error requesting document:', error);
    return { error: error.message };
  }
}

// ── Fetch Document Requests ─────────────────────────────────────────────────────────
export async function fetchDocumentRequests(userId, type = 'received') {
  const client = getClient();
  if (!client) return { data: null, error: 'no-supabase' };

  try {
    const field = type === 'sent' ? 'from_user_id' : 'to_user_id';
    
    const { data, error } = await client
      .from('document_requests')
      .select('*')
      .eq(field, userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching document requests:', error);
    return { data: null, error: error.message };
  }
}

// ── Respond to Document Request ─────────────────────────────────────────────────────
export async function respondToDocumentRequest(requestId, status, documentId = null, message = null) {
  const client = getClient();
  if (!client) return { error: 'no-supabase' };

  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (documentId) updateData.document_id = documentId;
    if (message) updateData.response_message = message;

    const { data, error } = await client
      .from('document_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error responding to document request:', error);
    return { error: error.message };
  }
}

// ── Enhanced CV Profile Management ─────────────────────────────────────────────────────
export async function saveCVProfile(userId, cvData) {
  const client = getClient();
  if (!client) return { error: 'no-supabase' };

  try {
    const profile = {
      id: uid(),
      user_id: userId,
      title: cvData.title,
      summary: cvData.summary || '',
      skills: cvData.skills || [],
      experience: cvData.experience || [],
      education: cvData.education || [],
      languages: cvData.languages || [],
      certifications: cvData.certifications || [],
      references: cvData.references || [],
      portfolio_url: cvData.portfolio_url || '',
      linkedin_url: cvData.linkedin_url || '',
      github_url: cvData.github_url || '',
      preferred_location: cvData.preferred_location || '',
      expected_salary: cvData.expected_salary || '',
      job_type: cvData.job_type || 'full_time', // full_time, part_time, contract, freelance
      availability: cvData.availability || 'immediately', // immediately, 2_weeks, 1_month, flexible
      remote_work: cvData.remote_work || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('cv_profiles')
      .upsert(profile, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error saving CV profile:', error);
    return { error: error.message };
  }
}

// ── Fetch CV Profile ───────────────────────────────────────────────────────────────
export async function fetchCVProfile(userId) {
  const client = getClient();
  if (!client) return { data: null, error: 'no-supabase' };

  try {
    const { data, error } = await client
      .from('cv_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching CV profile:', error);
    return { data: null, error: error.message };
  }
}

interface CVFilters {
  skills?: string[];
  location?: string;
  job_type?: string;
  remote_work?: boolean;
  availability?: string;
  min_salary?: string | number;
  max_salary?: string | number;
}

// ── Search CV Profiles (for employers) ───────────────────────────────────────────────
export async function searchCVProfiles(filters: CVFilters = {}) {
  const client = getClient();
  if (!client) return { data: null, error: 'no-supabase' };

  try {
    let query = client
      .from('cv_profiles')
      .select(`
        *,
        profiles!cv_profiles_user_id_fkey (
          full_name,
          phone,
          subcity,
          kyc_status
        )
      `) as any;

    // Apply filters
    if (filters.skills?.length) {
      query = query.contains('skills', filters.skills);
    }
    if (filters.location) {
      query = query.eq('preferred_location', filters.location);
    }
    if (filters.job_type) {
      query = query.eq('job_type', filters.job_type);
    }
    if (filters.remote_work !== undefined) {
      query = query.eq('remote_work', filters.remote_work);
    }
    if (filters.availability) {
      query = query.eq('availability', filters.availability);
    }
    if (filters.min_salary) {
      query = query.gte('expected_salary', filters.min_salary);
    }
    if (filters.max_salary) {
      query = query.lte('expected_salary', filters.max_salary);
    }

    const { data, error } = await (query as any).order('updated_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error searching CV profiles:', error);
    return { data: null, error: error.message };
  }
}

export default {
  DOCUMENT_TYPES,
  uploadDocument,
  fetchUserDocuments,
  fetchDocumentsByFilter,
  deleteDocument,
  updateDocumentStatus,
  requestDocument,
  fetchDocumentRequests,
  respondToDocumentRequest,
  saveCVProfile,
  fetchCVProfile,
  searchCVProfiles,
};
