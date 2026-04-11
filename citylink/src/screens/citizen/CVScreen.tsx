import React, { useState } from 'react';
import { View, Text as RNText, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, DarkColors, Radius, Fonts, Shadow } from '../../theme';
import { Card, CButton, CInput, CSelect, SectionTitle, EmptyState } from '../../components';
import { t } from '../../utils/i18n';

function useTheme() {
  const isDark = useAppStore((s) => s.isDark);
  return isDark ? DarkColors : Colors;
}

export default function CVScreen() {
  const C = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const showToast = useAppStore((s) => s.showToast);
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState('profile'); // profile, documents, requests
  const [loading, setLoading] = useState(false);

  // CV Data
  const [title, setTitle] = useState(currentUser?.cv?.title || '');
  const [summary, setSummary] = useState(currentUser?.cv?.summary || '');
  const [skills, setSkills] = useState(currentUser?.cv?.skills || []);
  const [experience, setExperience] = useState(currentUser?.cv?.experience || []);
  const [education, setEducation] = useState(currentUser?.cv?.education || []);
  const [portfolioUrl, setPortfolioUrl] = useState(currentUser?.cv?.portfolio_url || '');
  const [linkedinUrl, setLinkedinUrl] = useState(currentUser?.cv?.linkedin_url || '');
  const [githubUrl, setGithubUrl] = useState(currentUser?.cv?.github_url || '');
  const [expectedSalary, setExpectedSalary] = useState(currentUser?.cv?.expected_salary || '');
  const [jobType, setJobType] = useState(currentUser?.cv?.job_type || 'full_time');
  const [availability, setAvailability] = useState(currentUser?.cv?.availability || 'immediately');
  const [remoteWork, setRemoteWork] = useState(currentUser?.cv?.remote_work || false);

  // Documents
  const [documents, setDocuments] = useState([]);
  const [documentRequests, setDocumentRequests] = useState([]);

  const saveCV = async () => {
    setLoading(true);
    try {
      showToast('CV Updated! ðŸ“„', 'success');
    } catch (error) {
      showToast('Failed to save CV', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderProfileTab = () => (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      <RNText style={{ color: C.sub, fontSize: 13, marginBottom: 20, fontFamily: Fonts.medium }}>
        Build your professional profile. This information will be visible to employers.
      </RNText>

      <CInput
        label="Job Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Senior Software Engineer"
      />
      <CInput
        label="Professional Summary"
        value={summary}
        onChangeText={setSummary}
        placeholder="Brief description of your experience and goals"
        multiline
        numberOfLines={3}
      />

      <SectionTitle title="Skills" />
      <CInput
        label="Skills (comma-separated)"
        value={skills.join(', ')}
        onChangeText={(text) =>
          setSkills(
            text
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          )
        }
        placeholder="React, Node.js, Project Management..."
      />

      <SectionTitle title="Experience" />
      {experience.map((exp, idx) => (
        <Card key={idx} style={{ marginBottom: 10 }}>
          <RNText style={{ color: C.text, fontFamily: Fonts.black }}>{exp.title}</RNText>
          <RNText style={{ color: C.sub, fontSize: 12 }}>
            {exp.company} â€¢ {exp.years}
          </RNText>
        </Card>
      ))}
      <CButton
        title="+ Add Experience"
        variant="ghost"
        size="sm"
        onPress={() => showToast('Feature coming soon', 'info')}
      />

      <SectionTitle title="Education" />
      {education.map((edu, idx) => (
        <Card key={idx} style={{ marginBottom: 10 }}>
          <RNText style={{ color: C.text, fontFamily: Fonts.black }}>{edu.degree}</RNText>
          <RNText style={{ color: C.sub, fontSize: 12 }}>
            {edu.school} â€¢ {edu.year}
          </RNText>
        </Card>
      ))}
      <CButton
        title="+ Add Education"
        variant="ghost"
        size="sm"
        onPress={() => showToast('Feature coming soon', 'info')}
      />

      <SectionTitle title="Portfolio & Links" />
      <CInput
        label="Portfolio URL"
        value={portfolioUrl}
        onChangeText={setPortfolioUrl}
        placeholder="https://yourportfolio.com"
      />
      <CInput
        label="LinkedIn URL"
        value={linkedinUrl}
        onChangeText={setLinkedinUrl}
        placeholder="https://linkedin.com/in/yourprofile"
      />
      <CInput
        label="GitHub URL"
        value={githubUrl}
        onChangeText={setGithubUrl}
        placeholder="https://github.com/yourusername"
      />

      <SectionTitle title="Job Preferences" />
      <CSelect
        label="Job Type"
        value={jobType}
        onValueChange={setJobType}
        options={[
          { value: 'full_time', label: 'Full Time' },
          { value: 'part_time', label: 'Part Time' },
          { value: 'contract', label: 'Contract' },
          { value: 'freelance', label: 'Freelance' },
        ]}
      />
      <CSelect
        label="Availability"
        value={availability}
        onValueChange={setAvailability}
        options={[
          { value: 'immediately', label: 'Immediately' },
          { value: '2_weeks', label: '2 Weeks' },
          { value: '1_month', label: '1 Month' },
          { value: 'flexible', label: 'Flexible' },
        ]}
      />
      <CInput
        label="Expected Salary (ETB)"
        value={expectedSalary}
        onChangeText={setExpectedSalary}
        placeholder="e.g. 15000"
        keyboardType="numeric"
      />

      <View style={{ marginTop: 30 }}>
        <CButton title={loading ? 'Saving...' : 'Save CV'} onPress={saveCV} loading={loading} />
      </View>
    </ScrollView>
  );

  const renderDocumentsTab = () => (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      {/* ... implementation for Documents tab ... */}
      <SectionTitle title="My Documents" />
      <EmptyState
        icon="ðŸ“„"
        title="No documents yet"
        subtitle="Upload your ID, certificates, and other important documents"
        action="Upload First Document"
        onAction={() => showToast('Document upload coming soon', 'info')}
      />
    </ScrollView>
  );

  const renderRequestsTab = () => (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      {/* ... implementation for Requests tab ... */}
      <SectionTitle title="Document Requests" />
      <EmptyState
        icon="ðŸ“¨"
        title="No document requests"
        subtitle="Employers will request documents here when needed"
      />
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <TopBar title={t('prof_profile')} />
      <View
        style={{
          flexDirection: 'row',
          padding: 16,
          backgroundColor: C.surface,
          borderBottomWidth: 1,
          borderBottomColor: C.edge,
        }}
      >
        {['profile', 'documents', 'requests'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab ? C.primary : 'transparent',
            }}
          >
            <RNText
              style={{
                color: activeTab === tab ? C.primary : C.sub,
                fontFamily: Fonts.black,
                textTransform: 'capitalize',
                fontSize: 12,
              }}
            >
              {tab}
            </RNText>
          </TouchableOpacity>
        ))}
      </View>
      {activeTab === 'profile' && renderProfileTab()}
      {activeTab === 'documents' && renderDocumentsTab()}
      {activeTab === 'requests' && renderRequestsTab()}
    </View>
  );
}
