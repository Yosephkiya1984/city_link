import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Spacing, Shadow, Fonts, FontSize } from '../../theme';
import { CButton, Card, SectionTitle, CInput } from '../../components';
import { fmtETB, uid, fmtDateTime } from '../../utils';
import { t } from '../../utils/i18n';

import { useRealtimePostgres } from '../../hooks/useRealtimePostgres';
import {
  fetchJobListings,
  fetchJobApplications,
  updateApplicationStatus,
  createJobListing,
} from '../../services/jobs.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Employer color scheme
const EMPLOYER_COLORS = {
  primary: '#8B5CF6',
  primaryL: 'rgba(139,92,246,0.1)',
  primaryB: 'rgba(139,92,246,0.28)',
  status: {
    APPLIED: '#8A9AB8', // Grey
    REVIEWING: '#2D7EF0', // Blue
    SHORTLISTED: '#8B5CF6', // Purple
    OFFERED: '#00A86B', // Green
    REJECTED: '#E8312A', // Red
  },
};

export default function EmployerDashboard() {
  const navigation = useNavigation();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? DarkColors : Colors;
  const balance = useAppStore((s) => s.balance);
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const reset = useAppStore((s) => s.reset);

  const [activeTab, setActiveTab] = useState('listings');
  const [jobListings, setJobListings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddJob, setShowAddJob] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationDetail, setShowApplicationDetail] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    salary_range: '',
    type: 'FULL_TIME',
    description: '',
    location: '',
    status: 'OPEN',
  });

  // KPI calculations
  const totalApplications = applications.length;
  const reviewingApplications = applications.filter((a) => a.status === 'REVIEWING').length;
  const shortlistedApplications = applications.filter((a) => a.status === 'SHORTLISTED').length;
  const offeredApplications = applications.filter((a) => a.status === 'OFFERED').length;

  const activeJobs = jobListings.filter((job) => job.status === 'OPEN').length;

  const loadData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [listingsRes, applicationsRes] = await Promise.all([
        fetchJobListings(currentUser.id),
        fetchJobApplications(currentUser.id),
      ]);

      if (listingsRes.data) setJobListings(listingsRes.data);
      if (applicationsRes.data) {
        const sortedApplications = applicationsRes.data.sort(
          (a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
        );
        setApplications(sortedApplications);
      }
    } catch (error) {
      showToast('Failed to load data', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  // Real-time application updates
  useRealtimePostgres({
    channelName: `job-applications-${currentUser?.id}`,
    table: 'job_applications',
    filter: `employer_id=eq.${currentUser?.id}`,
    enabled: !!currentUser?.id,
    onPayload: (payload) => {
      if (payload.eventType === 'INSERT') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('💼 New application received!', 'success');
        loadData();
      } else {
        loadData();
      }
    },
  });

  const updateApplication = async (applicationId, newStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const result = await updateApplicationStatus(applicationId, newStatus);
      if (!result.error) {
        showToast(`Application ${newStatus.toLowerCase()}`, 'success');
        loadData();
      } else {
        showToast(result.error || 'Failed to update application', 'error');
      }
    } catch (error) {
      showToast('Failed to update application', 'error');
    }
    setLoading(false);
  };

  const createJob = async () => {
    if (!newJob.title || !newJob.description) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const jobData = {
        id: uid(),
        employer_id: currentUser.id,
        title: newJob.title,
        salary_range: newJob.salary_range,
        type: newJob.type,
        description: newJob.description,
        location: newJob.location,
        status: newJob.status,
        created_at: new Date().toISOString(),
      };

      const result = await createJobListing(jobData);
      if (!result.error) {
        setJobListings([jobData, ...jobListings]);
        setNewJob({
          title: '',
          salary_range: '',
          type: 'FULL_TIME',
          description: '',
          location: '',
          status: 'OPEN',
        });
        setShowAddJob(false);
        showToast('Job posted successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to post job', 'error');
      }
    } catch (error) {
      showToast('Failed to post job', 'error');
    }
    setLoading(false);
  };

  const logout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast('Logged out successfully', 'success');
    reset();

    // Use navigation.replace instead of reset to avoid the error
    try {
      (navigation as any).replace('Auth');
    } catch (error) {
      console.log('Navigation reset error, trying alternative method');
      (navigation as any).navigate('Auth');
    }
  };

  const getStatusColor = (status) => EMPLOYER_COLORS.status[status] || C.sub;
  const getStatusBg = (status) => {
    const color = EMPLOYER_COLORS.status[status];
    return color ? `${color}20` : C.surface;
  };

  const ApplicationCard = ({ application }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedApplication(application);
        setShowApplicationDetail(true);
      }}
    >
      <Card
        style={{
          marginBottom: 12,
          padding: 16,
          borderLeftWidth: 3,
          borderLeftColor: getStatusColor(application.status),
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={{ color: C.text, fontSize: 15, fontFamily: Fonts.black }}>
                {application.applicant_name || 'Applicant'}
              </Text>
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor: getStatusBg(application.status),
                }}
              >
                <Text
                  style={{
                    color: getStatusColor(application.status),
                    fontSize: 9,
                    fontFamily: Fonts.bold,
                    textTransform: 'uppercase',
                  }}
                >
                  {application.status || 'APPLIED'}
                </Text>
              </View>
            </View>

            <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 4 }}>
              {application.job_title}
            </Text>

            <Text style={{ color: C.sub, fontSize: 11, marginBottom: 8 }}>
              Applied: {new Date(application.applied_at).toLocaleDateString()}
            </Text>

            {application.cover_note && (
              <Text style={{ color: C.sub, fontSize: 12 }} numberOfLines={2}>
                {application.cover_note}
              </Text>
            )}
          </View>
        </View>

        {application.status === 'APPLIED' && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <CButton
              title="Review"
              onPress={() => updateApplication(application.id, 'REVIEWING')}
              style={{ flex: 1 }}
              size="sm"
            />
          </View>
        )}

        {application.status === 'REVIEWING' && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <CButton
              title="Shortlist"
              onPress={() => updateApplication(application.id, 'SHORTLISTED')}
              style={{ flex: 1, backgroundColor: EMPLOYER_COLORS.primaryL }}
              size="sm"
            />
            <CButton
              title="Reject"
              onPress={() => updateApplication(application.id, 'REJECTED')}
              style={{ flex: 1, backgroundColor: '#E8312A' }}
              size="sm"
            />
          </View>
        )}

        {application.status === 'SHORTLISTED' && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <CButton
              title="Make Offer"
              onPress={() => updateApplication(application.id, 'OFFERED')}
              style={{ flex: 1 }}
              size="sm"
            />
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  const PipelineFunnel = () => {
    const stages = [
      { name: 'Applied', count: totalApplications, color: '#8A9AB8' },
      {
        name: 'Reviewed',
        count: reviewingApplications + shortlistedApplications + offeredApplications,
        color: '#2D7EF0',
      },
      {
        name: 'Shortlisted',
        count: shortlistedApplications + offeredApplications,
        color: '#8B5CF6',
      },
      { name: 'Offered', count: offeredApplications, color: '#00A86B' },
    ];

    const maxCount = Math.max(...stages.map((s) => s.count), 1);

    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: C.text, fontSize: 14, fontFamily: Fonts.black, marginBottom: 12 }}>
          Pipeline Funnel
        </Text>
        {stages.map((stage, index) => (
          <View key={stage.name} style={{ marginBottom: 8 }}>
            <View
              style={{
                backgroundColor: `${stage.color}20`,
                borderRadius: 3,
                height: 18,
                width: `${(stage.count / maxCount) * 100}%`,
                justifyContent: 'center',
                paddingLeft: 8,
              }}
            >
              <Text
                style={{
                  color: stage.color,
                  fontSize: 10,
                  fontFamily: Fonts.bold,
                }}
              >
                {stage.name}: {stage.count} (
                {totalApplications > 0 ? Math.round((stage.count / totalApplications) * 100) : 0}%)
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar
        title="💼 Employer Dashboard"
        right={
          <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
            <Ionicons name="log-out-outline" size={24} color={C.text} />
          </TouchableOpacity>
        }
      />

      {/* Additional Logout Button for visibility */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 8,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.edge2,
        }}
      >
        <TouchableOpacity
          onPress={logout}
          style={{
            backgroundColor: '#E8312A',
            borderRadius: Radius.xl,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            alignSelf: 'flex-end',
          }}
        >
          <Ionicons name="log-out" size={16} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontFamily: Fonts.bold }}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Header */}
        <View style={{ padding: 16 }}>
          <LinearGradient
            colors={[EMPLOYER_COLORS.primaryL, 'transparent']}
            style={{ borderRadius: Radius['3xl'], padding: 24, ...Shadow.md }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: C.text, fontSize: 13, fontFamily: Fonts.bold, opacity: 0.8 }}>
                  Active Jobs
                </Text>
                <Text
                  style={{
                    color: EMPLOYER_COLORS.primary,
                    fontSize: 32,
                    fontFamily: Fonts.black,
                    marginTop: 4,
                  }}
                >
                  {activeJobs}
                </Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: EMPLOYER_COLORS.primaryL,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="briefcase" size={24} color={EMPLOYER_COLORS.primary} />
              </View>
            </View>

            <View
              style={{ height: 1, backgroundColor: 'rgba(139,92,246,0.2)', marginVertical: 20 }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#2D7EF0', fontSize: 16, fontFamily: Fonts.black }}>
                  {totalApplications}
                </Text>
                <Text
                  style={{ color: 'rgba(45,126,240,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  APPLICATIONS
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{ color: EMPLOYER_COLORS.primary, fontSize: 16, fontFamily: Fonts.black }}
                >
                  {shortlistedApplications}
                </Text>
                <Text
                  style={{ color: 'rgba(139,92,246,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  SHORTLISTED
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: '#00A86B', fontSize: 16, fontFamily: Fonts.black }}>
                  {offeredApplications}
                </Text>
                <Text
                  style={{ color: 'rgba(0,168,107,0.7)', fontSize: 10, fontFamily: Fonts.bold }}
                >
                  OFFERED
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Tab Navigation */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 }}>
          {['listings', 'applications', 'pipeline', 'stats'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: Radius.xl,
                backgroundColor: activeTab === tab ? EMPLOYER_COLORS.primaryL : C.surface,
                borderWidth: 1.5,
                borderColor: activeTab === tab ? EMPLOYER_COLORS.primaryB : C.edge2,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: activeTab === tab ? EMPLOYER_COLORS.primary : C.sub,
                  fontSize: 11,
                  fontFamily: Fonts.black,
                  textTransform: 'uppercase',
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'listings' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Job Listings" />
            <CButton
              title="Post New Job"
              onPress={() => setShowAddJob(true)}
              style={{ marginBottom: 16 }}
            />

            {loading && jobListings.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading jobs...
              </Text>
            ) : jobListings.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                No job listings yet
              </Text>
            ) : (
              jobListings.map((job) => (
                <Card key={job.id} style={{ marginBottom: 12, padding: 16 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: C.text,
                          fontSize: 16,
                          fontFamily: Fonts.black,
                          marginBottom: 4,
                        }}
                      >
                        {job.title}
                      </Text>
                      {job.salary_range && (
                        <Text
                          style={{ color: EMPLOYER_COLORS.primary, fontSize: 14, marginBottom: 4 }}
                        >
                          {job.salary_range}
                        </Text>
                      )}
                      {job.location && (
                        <Text style={{ color: C.sub, fontSize: 12, marginBottom: 4 }}>
                          ðŸ“ {job.location}
                        </Text>
                      )}
                      <View
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          backgroundColor:
                            job.status === 'OPEN'
                              ? EMPLOYER_COLORS.primaryL
                              : 'rgba(138,154,184,0.1)',
                          alignSelf: 'flex-start',
                        }}
                      >
                        <Text
                          style={{
                            color: job.status === 'OPEN' ? EMPLOYER_COLORS.primary : C.sub,
                            fontSize: 9,
                            fontFamily: Fonts.bold,
                            textTransform: 'uppercase',
                          }}
                        >
                          {job.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'applications' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Recent Applications" />
            {loading && applications.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                Loading applications...
              </Text>
            ) : applications.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
                No applications yet
              </Text>
            ) : (
              applications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))
            )}
          </View>
        )}

        {activeTab === 'pipeline' && (
          <View>
            <SectionTitle title="Hiring Pipeline" />
            <PipelineFunnel />
          </View>
        )}

        {activeTab === 'stats' && (
          <View style={{ paddingHorizontal: 16 }}>
            <SectionTitle title="Analytics" />
            <Text style={{ color: C.sub, textAlign: 'center', padding: 20 }}>
              Analytics dashboard coming soon
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Job Modal */}
      <Modal visible={showAddJob} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: C.ink }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: C.edge2,
            }}
          >
            <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
              Post New Job
            </Text>
            <TouchableOpacity onPress={() => setShowAddJob(false)} style={{ padding: 8 }}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Job Title *
              </Text>
              <CInput
                placeholder="Enter job title"
                value={newJob.title}
                onChangeText={(text) => setNewJob({ ...newJob, title: text })}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Salary Range
              </Text>
              <CInput
                placeholder="e.g., 20,000 - 35,000 ETB"
                value={newJob.salary_range}
                onChangeText={(text) => setNewJob({ ...newJob, salary_range: text })}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Job Type
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['FULL_TIME', 'PART_TIME', 'REMOTE', 'CONTRACT'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setNewJob({ ...newJob, type })}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor: newJob.type === type ? EMPLOYER_COLORS.primaryL : C.surface,
                      borderWidth: 1,
                      borderColor: newJob.type === type ? EMPLOYER_COLORS.primaryB : C.edge2,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: newJob.type === type ? EMPLOYER_COLORS.primary : C.sub,
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                      }}
                    >
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Location
              </Text>
              <CInput
                placeholder="e.g., Addis Ababa, Bole"
                value={newJob.location}
                onChangeText={(text) => setNewJob({ ...newJob, location: text })}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text
                style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 8 }}
              >
                Job Description *
              </Text>
              <CInput
                placeholder="Describe the role, responsibilities, and requirements"
                value={newJob.description}
                onChangeText={(text) => setNewJob({ ...newJob, description: text })}
                multiline
                numberOfLines={5}
              />
            </View>

            <CButton
              title="Post Job"
              onPress={createJob}
              loading={loading}
              style={{ marginTop: 20 }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Application Detail Modal */}
      <Modal visible={showApplicationDetail} animationType="slide" presentationStyle="pageSheet">
        {selectedApplication && (
          <View style={{ flex: 1, backgroundColor: C.ink }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.edge2,
              }}
            >
              <Text style={{ color: C.text, fontSize: 18, fontFamily: Fonts.black }}>
                Application Details
              </Text>
              <TouchableOpacity
                onPress={() => setShowApplicationDetail(false)}
                style={{ padding: 8 }}
              >
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Card style={{ padding: 16, marginBottom: 16 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 16, fontFamily: Fonts.black }}>
                    {selectedApplication.applicant_name || 'Applicant'}
                  </Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: getStatusBg(selectedApplication.status),
                    }}
                  >
                    <Text
                      style={{
                        color: getStatusColor(selectedApplication.status),
                        fontSize: 10,
                        fontFamily: Fonts.bold,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedApplication.status}
                    </Text>
                  </View>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text
                    style={{ color: C.text, fontSize: 14, fontFamily: Fonts.bold, marginBottom: 4 }}
                  >
                    {selectedApplication.job_title}
                  </Text>
                  <Text style={{ color: C.sub, fontSize: 12 }}>
                    Applied: {new Date(selectedApplication.applied_at).toLocaleString()}
                  </Text>
                </View>

                {selectedApplication.cover_note && (
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        color: C.text,
                        fontSize: 14,
                        fontFamily: Fonts.bold,
                        marginBottom: 4,
                      }}
                    >
                      Cover Note
                    </Text>
                    <Text style={{ color: C.sub, fontSize: 12, lineHeight: 18 }}>
                      {selectedApplication.cover_note}
                    </Text>
                  </View>
                )}
              </Card>

              {selectedApplication.status === 'APPLIED' && (
                <CButton
                  title="Start Review"
                  onPress={() => updateApplication(selectedApplication.id, 'REVIEWING')}
                />
              )}

              {selectedApplication.status === 'REVIEWING' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <CButton
                    title="Shortlist"
                    onPress={() => updateApplication(selectedApplication.id, 'SHORTLISTED')}
                    style={{ flex: 1, backgroundColor: EMPLOYER_COLORS.primaryL }}
                  />
                  <CButton
                    title="Reject"
                    onPress={() => updateApplication(selectedApplication.id, 'REJECTED')}
                    style={{ flex: 1, backgroundColor: '#E8312A' }}
                  />
                </View>
              )}

              {selectedApplication.status === 'SHORTLISTED' && (
                <CButton
                  title="Make Offer"
                  onPress={() => updateApplication(selectedApplication.id, 'OFFERED')}
                />
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}
