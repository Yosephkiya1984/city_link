import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, RefreshControl, FlatList } from 'react-native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius, Spacing } from '../../theme';
import { CButton, SearchBar, ChipBar, EmptyState, LoadingRow, SectionTitle } from '../../components';
import { fetchJobs, applyForJob, fetchMyApplications } from '../../services/jobs.service';
import { fmtETB, timeAgo, uid } from '../../utils';
import { useRealtimePostgres } from '../../hooks/useRealtimePostgres';

const JOB_CATS = ['All','Tech','Finance','Healthcare','Education','Hospitality','Construction','Other'];

const DEMO_JOBS = [
  { id:'j1', title:'Senior Software Engineer', company:'Ethio Telecom', salary_min:25000, salary_max:40000,
    type:'FULL_TIME', category:'Tech', location:'Bole', description:'We are looking for a senior backend engineer...', created_at: new Date(Date.now()-86400000).toISOString(), status:'OPEN' },
  { id:'j2', title:'Bank Teller', company:'Commercial Bank of Ethiopia', salary_min:8000, salary_max:12000,
    type:'FULL_TIME', category:'Finance', location:'Kirkos', description:'Handle daily banking transactions...', created_at: new Date(Date.now()-2*86400000).toISOString(), status:'OPEN' },
  { id:'j3', title:'Nurse (ICU)', company:'Black Lion Hospital', salary_min:15000, salary_max:22000,
    type:'FULL_TIME', category:'Healthcare', location:'Lideta', description:'Provide critical care nursing...', created_at: new Date(Date.now()-3*86400000).toISOString(), status:'OPEN' },
  { id:'j4', title:'Restaurant Manager', company:'Yeshi Buna Café', salary_min:12000, salary_max:18000,
    type:'FULL_TIME', category:'Hospitality', location:'Bole', description:'Manage daily operations of busy café...', created_at: new Date(Date.now()-86400000).toISOString(), status:'OPEN' },
  { id:'j5', title:'React Native Developer', company:'Qemer Tech', salary_min:20000, salary_max:35000,
    type:'REMOTE', category:'Tech', location:'Remote', description:'Build mobile apps for Ethiopian market...', created_at: new Date().toISOString(), status:'OPEN' },
];

const TYPE_COLORS = { FULL_TIME: '#00A86B', PART_TIME: '#2D7EF0', REMOTE: '#8B5CF6', CONTRACT: '#F5B800' };

export default function JobsScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const currentUser = useAppStore((s) => s.currentUser);
  const jobs = useAppStore((s) => (s as any).jobs);
  const setJobs = useAppStore((s) => (s as any).setJobs);
  const myApplications = useAppStore((s) => (s as any).myApplications);
  const setMyApplications = useAppStore((s) => (s as any).setMyApplications);
  const activeJobCat = useAppStore((s) => (s as any).activeJobCat);
  const setActiveJobCat = useAppStore((s) => (s as any).setActiveJobCat);
  const jobSearch = useAppStore((s) => (s as any).jobSearch);
  const setJobSearch = useAppStore((s) => (s as any).setJobSearch);
  const showToast = useAppStore((s) => s.showToast);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);

  const load = useCallback(async () => {
    const { data } = await fetchJobs();
    setJobs(data?.length ? data : DEMO_JOBS);
    if (currentUser?.id) {
      const { data: apps } = await fetchMyApplications(currentUser.id);
      if (apps) setMyApplications(apps);
    }
    setLoading(false);
  }, [currentUser?.id, setJobs, setMyApplications]);

  useEffect(() => { load(); }, [load]);

  useRealtimePostgres({
    channelName: currentUser?.id ? `cl-rt-jobapp-${currentUser.id}` : 'cl-rt-jobapp',
    table: 'job_applications',
    filter: currentUser?.id ? `applicant_id=eq.${currentUser.id}` : undefined,
    enabled: !!currentUser?.id,
    onPayload: load,
  });

  async function handleApply() {
    if (!selectedJob) return;
    const alreadyApplied = myApplications.some((a: any) =>
      a.job_id === selectedJob.id || a.jobId === selectedJob.id);
    if (alreadyApplied) { showToast('You already applied for this job', 'warning'); return; }

    setApplying(true);
    const application: any = {
      id: uid(),
      job_id: selectedJob.id,
      applicant_id: currentUser?.id || '',
      cover_letter: coverLetter.trim() || null,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    const { error } = await applyForJob(application);
    if (!error) {
      setMyApplications([application, ...myApplications]);
      showToast('Application submitted! ✅', 'success');
      setShowApplyModal(false);
      setSelectedJob(null);
      setCoverLetter('');
    } else {
      showToast(error, 'error');
    }
    setApplying(false);
  }

  const filtered = (jobs || []).filter((j: any) => {
    const matchCat = activeJobCat === 'All' || j.category === activeJobCat;
    const matchSearch = !jobSearch || j.title?.toLowerCase().includes(jobSearch.toLowerCase()) ||
      j.company?.toLowerCase().includes(jobSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const hasApplied = (jobId: string) => myApplications.some((a: any) => a.job_id === jobId || a.jobId === jobId);

  const renderHeader = () => (
    <View style={{ paddingBottom: 10 }}>
       {myApplications.length > 0 && (
          <>
            <SectionTitle title={`My Applications (${myApplications.length})`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal:16, gap:10, paddingBottom:8 }}>
              {myApplications.map((app: any) => {
                const STATUS_COLORS: any = { PENDING:C.amber, REVIEWING:C.blue, SHORTLISTED:C.purple, OFFERED:C.green, REJECTED:C.red };
                const color = STATUS_COLORS[app.status] || C.sub;
                return (
                  <View key={app.id} style={{ backgroundColor:C.surface, borderRadius:Radius.xl,
                    borderWidth:1, borderColor:C.edge, padding:12, width:160 }}>
                    <Text style={{ color:C.text, fontSize:FontSize.md, fontWeight:'700' }} numberOfLines={2}>
                      {app.job_listings?.title || app.job_id || 'Job Application'}
                    </Text>
                    <View style={{ marginTop:8, paddingHorizontal:8, paddingVertical:3,
                      borderRadius:6, backgroundColor:color+'22', alignSelf:'flex-start' }}>
                      <Text style={{ color, fontSize:FontSize.xs, fontWeight:'800' }}>{app.status}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </>
        )}
        <SectionTitle title={`${filtered.length} Openings`} />
    </View>
  );

  const renderJob = ({ item: job }: any) => (
    <TouchableOpacity onPress={() => setSelectedJob(job)}
      style={{ marginHorizontal:16, marginBottom:10, backgroundColor:C.surface,
        borderRadius:Radius.xl, borderWidth:1, borderColor:C.edge, padding:16 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
        <View style={{ flex:1 }}>
          <Text style={{ color:C.text, fontSize:FontSize.xl, fontWeight:'700' }}>{job.title}</Text>
          <Text style={{ color:C.sub, fontSize:FontSize.md, marginTop:2 }}>
            🏢 {job.company || job.profiles?.merchant_name || 'Company'}
          </Text>
          <Text style={{ color:C.sub, fontSize:FontSize.sm, marginTop:1 }}>📍 {job.location}</Text>
        </View>
        {hasApplied(job.id) && (
          <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:6,
            backgroundColor:C.greenL, borderWidth:1, borderColor:C.greenB }}>
            <Text style={{ color:C.green, fontSize:FontSize.xs, fontWeight:'800' }}>APPLIED</Text>
          </View>
        )}
      </View>

      {(job.salary_min || job.salary_max) && (
        <Text style={{ color:C.green, fontWeight:'700', fontSize:FontSize.lg, marginTop:8 }}>
          {job.salary_min ? fmtETB(job.salary_min,0) : ''}{job.salary_min && job.salary_max ? ' – ' : ''}
          {job.salary_max ? fmtETB(job.salary_max,0) : ''} ETB/mo
        </Text>
      )}

      <View style={{ flexDirection:'row', gap:8, marginTop:10, alignItems:'center' }}>
        <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:6,
          backgroundColor:((TYPE_COLORS as any)[job.type]||C.blue)+'22' }}>
          <Text style={{ color:(TYPE_COLORS as any)[job.type]||C.blue, fontSize:FontSize.xs, fontWeight:'700' }}>
            {(job.type||'').replace('_',' ')}
          </Text>
        </View>
        <View style={{ paddingHorizontal:8, paddingVertical:3, borderRadius:6, backgroundColor:C.blueL }}>
          <Text style={{ color:C.blue, fontSize:FontSize.xs, fontWeight:'700' }}>
            {job.category}
          </Text>
        </View>
        <Text style={{ color:C.sub, fontSize:FontSize.xs, marginLeft:'auto' }}>{timeAgo(job.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex:1, backgroundColor:C.ink }}>
      <TopBar title="💼 Jobs" />
      <SearchBar value={jobSearch} onChangeText={setJobSearch} placeholder="Search jobs…" style={{ marginTop:10 }} />
      <ChipBar chips={JOB_CATS} selected={activeJobCat} onSelect={setActiveJobCat} />

      {loading ? <LoadingRow /> : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          renderItem={renderJob}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={<EmptyState icon="💼" title="No jobs found" subtitle="Try a different category or search." />}
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{ setRefreshing(true); await load(); setRefreshing(false); }} tintColor={C.green} />}
        />
      )}

      <Modal visible={!!selectedJob} transparent animationType="slide">
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)' }} onPress={() => setSelectedJob(null)} />
        {selectedJob && (
          <View style={{ backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24,
            padding:24, paddingBottom:40, maxHeight:'85%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color:C.text, fontSize:FontSize['3xl'], fontWeight:'800', marginBottom:4 }}>
                {selectedJob.title}
              </Text>
              <Text style={{ color:C.sub, fontSize:FontSize.lg, marginBottom:16 }}>
                🏢 {selectedJob.company} · 📍 {selectedJob.location}
              </Text>
              {selectedJob.salary_min && (
                <Text style={{ color:C.green, fontSize:FontSize.xl, fontWeight:'800', marginBottom:16 }}>
                  {fmtETB(selectedJob.salary_min,0)} – {fmtETB(selectedJob.salary_max||0,0)} ETB/mo
                </Text>
              )}
              <Text style={{ color:C.sub, fontSize:FontSize.lg, lineHeight:22, marginBottom:20 }}>
                {selectedJob.description}
              </Text>

              {!hasApplied(selectedJob.id) && !showApplyModal && (
                <CButton title="Apply Now →" onPress={() => setShowApplyModal(true)} />
              )}

              {showApplyModal && !hasApplied(selectedJob.id) && (
                <>
                  <Text style={{ color:C.text, fontSize:FontSize.xl, fontWeight:'700', marginBottom:12 }}>
                    Cover Letter (optional)
                  </Text>
                  <View style={{ backgroundColor:C.lift, borderRadius:Radius.lg, borderWidth:1,
                    borderColor:C.edge2, padding:12, marginBottom:16, minHeight:100 }}>
                    <Text style={{ color:C.text, fontSize:FontSize.lg }} onPress={()=>{}}
                      numberOfLines={undefined}>{coverLetter || 'Tap to add a note…'}</Text>
                  </View>
                  <CButton title={applying ? 'Submitting…' : '✅ Submit Application'}
                    onPress={handleApply} loading={applying} />
                  <CButton title="Cancel" onPress={() => setShowApplyModal(false)}
                    variant="ghost" style={{ marginTop:8 }} />
                </>
              )}

              {hasApplied(selectedJob.id) && (
                <View style={{ padding:16, backgroundColor:C.greenL, borderRadius:Radius.lg,
                  borderWidth:1, borderColor:C.greenB, alignItems:'center' }}>
                  <Text style={{ color:C.green, fontWeight:'800' }}>✅ Application Submitted</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}
