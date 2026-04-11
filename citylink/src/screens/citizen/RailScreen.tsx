import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import TopBar from '../../components/TopBar';
import { useAppStore } from '../../store/AppStore';
import { Colors, LightColors, FontSize, Radius, Spacing } from '../../theme';
import { CButton, TabBar, SectionTitle } from '../../components';
import { LRT_STATIONS, LRT_FARE_PER_KM, LRT_BASE_FARE } from '../../config';
import { calcLrtFare, fmtETB, genQrToken, uid, fmtTime } from '../../utils';
import { GTFSService } from '../../services/gtfs';
import { tapIn, tapOut } from '../../services/transit.service';
import { t } from '../../utils/i18n';

const EDR_TRAINS = [
  { id:'t1', from:'Addis Ababa (Lebu)', to:'Adama', departs:'06:00', arrives:'08:30', price:150, seats:45, class:'Economy' },
  { id:'t2', from:'Addis Ababa (Lebu)', to:'Dire Dawa', departs:'07:30', arrives:'14:00', price:280, seats:30, class:'1st Class' },
  { id:'t3', from:'Addis Ababa (Lebu)', to:'Adama', departs:'09:00', arrives:'11:30', price:150, seats:60, class:'Economy' },
  { id:'t4', from:'Addis Ababa (Lebu)', to:'Djibouti City', departs:'05:00', arrives:'22:00', price:650, seats:20, class:'Sleeper' },
];

const TABS = [{ value:'lrt', label:'ðŸš‡ LRT' }, { value:'edr', label:'ðŸš‚ EDR' }];

export default function RailScreen() {
  const isDark = useAppStore((s) => s.isDark);
  const C = isDark ? Colors : LightColors;
  const currentUser = useAppStore((s) => s.currentUser);
  const lrtJourney = useAppStore((s) => s.lrtJourney);
  const setLrtJourney = useAppStore((s) => s.setLrtJourney);
  const balance = useAppStore((s) => s.balance);
  const setBalance = useAppStore((s) => s.setBalance);
  const addTransaction = useAppStore((s) => s.addTransaction);
  const showToast = useAppStore((s) => s.showToast);

  const [tab, setTab] = useState('lrt');
  const [lrtTab, setLrtTab] = useState('map');  // map | journey
  const [liveTransit, setLiveTransit] = useState([]);
  
  useEffect(() => {
    const unsub = GTFSService.subscribe(setLiveTransit);
    return unsub;
  }, []);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [selectedExit, setSelectedExit] = useState(null);
  const [tapModal, setTapModal] = useState(false);
  const [tapType, setTapType] = useState('in');  // in | out
  const [edrFrom, setEdrFrom] = useState('Addis Ababa (Lebu)');
  const [edrTo, setEdrTo] = useState('');
  const [edrBookingModal, setEdrBookingModal] = useState(false);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let t;
    if (lrtJourney?.status === 'tapped-in') {
      t = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(lrtJourney.tapInTime)) / 1000));
      }, 1000);
    }
    return () => clearInterval(t);
  }, [lrtJourney]);

  const allStations = [...LRT_STATIONS.NS, ...LRT_STATIONS.EW];

async function handleTapIn(station) {
    const origin = station || selectedOrigin;
    if (!currentUser) { showToast('Sign in to tap in', 'error'); return; }
    if (!origin) { showToast('Select your boarding station','error'); return; }
    if (balance < 10) { showToast('Minimum 10 ETB balance required to travel','error'); return; }

    const sessionId = `LRT_${uid()}`;
    const qrToken = genQrToken('LRT');

    const sessionData = {
      id: sessionId,
      user_id: currentUser.id,
      origin_id: origin.id,
      origin_name: origin.name,
      status: 'tapped-in',
      line: origin.id.startsWith('ns') ? 'NS' : 'EW',
      qr_token: qrToken,
      tap_in_time: new Date().toISOString()
    };

    setLoading(true);
    try {
      const res = await tapIn(sessionData);
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      setLrtJourney({
        id: sessionId,
        originId: origin.id,
        originName: origin.name,
        status: 'tapped-in',
        tapInTime: sessionData.tap_in_time,
        qrToken: qrToken
      });

      setSelectedOrigin(origin);
      setTapModal(false);
      showToast(`Tapped in at ${origin.name} ðŸš‡`, 'success');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.error('LRT Tap In Error:', e);
      showToast('Tap-in failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleTapOut() {
    if (!lrtJourney || !selectedExit) return;
    
    setLoading(true);
    try {
      const res = await tapOut(lrtJourney.id, selectedExit.id, selectedExit.name);
      
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      const fare = res.data?.fare || 10;
      const newBal = res.data?.new_balance;

      if (newBal !== undefined) setBalance(newBal);

      setLrtJourney({
        ...lrtJourney,
        status: 'completed',
        exitId: selectedExit.id,
        exitName: selectedExit.name,
        tapOutTime: new Date().toISOString(),
        fareCharged: fare
      });

      setTapModal(false);
      showToast(`Tapped out. Fare: ${fmtETB(fare)} ETB ðŸŽ«`, 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('LRT Tap Out Error:', e);
      showToast('Tap-out failed. Connection error.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleEdrBook(train) {
    if (balance < train.price) { showToast('Insufficient balance','error'); return; }
    setBalance(balance - train.price);
    addTransaction({
      id: uid(), amount: train.price, type:'debit', category:'rail',
      description: `EDR ${train.from} â†’ ${train.to} (${train.departs})`,
      created_at: new Date().toISOString(),
    });
    showToast(`EDR ticket booked! ðŸš‚ Train ${train.departs}`, 'success');
    setEdrBookingModal(false);
  }

  return (
    <View style={{ flex:1, backgroundColor:C.ink }}>
      <TopBar title="ðŸš‡ Rail Transport" />
      <TabBar tabs={TABS} activeTab={tab} onTabChange={setTab} />

      <ScrollView contentContainerStyle={{ paddingBottom:80 }} showsVerticalScrollIndicator={false}>

        {/* â”€â”€ LRT TAB â”€â”€ */}
        {tab === 'lrt' && (
          <>
            {/* Active journey card */}
            {lrtJourney && (
              <View style={{ margin:16, borderRadius:Radius.xl, padding:16, borderWidth:2,
                borderColor: lrtJourney.status==='completed' ? C.blue : C.green,
                backgroundColor: lrtJourney.status==='completed' ? 'rgba(45,126,240,0.06)' : 'rgba(0,168,107,0.06)' }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                  <Text style={{ color: lrtJourney.status==='completed' ? C.blue : C.green,
                    fontSize:FontSize.sm, fontWeight:'700', textTransform:'uppercase' }}>
                    {lrtJourney.status === 'completed' ? 'âœ… Journey Completed' : 'ðŸš‡ On Journey'}
                  </Text>
                  {lrtJourney.status === 'tapped-in' && (
                    <Text style={{ fontFamily:'Courier', color:C.amber, fontWeight:'800' }}>
                      {String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection:'row', alignItems:'center', gap:8, marginTop:10 }}>
                  <View style={{ flex:1 }}>
                    <Text style={{ color:C.sub, fontSize:FontSize.xs }}>FROM</Text>
                    <Text style={{ color:C.text, fontWeight:'700' }}>{lrtJourney.originName}</Text>
                  </View>
                  <Text style={{ color:C.sub, fontSize:20 }}>â†’</Text>
                  <View style={{ flex:1 }}>
                    <Text style={{ color:C.sub, fontSize:FontSize.xs }}>TO</Text>
                    <Text style={{ color:C.text, fontWeight:'700' }}>
                      {lrtJourney.exitName || '?'}
                    </Text>
                  </View>
                </View>
                {lrtJourney.fareCharged !== undefined && (
                  <Text style={{ color:C.green, fontWeight:'800', fontSize:FontSize.xl, marginTop:8 }}>
                    Fare: {fmtETB(lrtJourney.fareCharged)} ETB
                  </Text>
                )}

                {/* Fare calculator preview */}
                {lrtJourney.status === 'tapped-in' && (
                  <View style={{ backgroundColor:'rgba(0,168,107,0.06)', borderRadius:Radius.lg,
                    borderWidth:1, borderColor:'rgba(0,168,107,0.2)', padding:12, marginTop:12 }}>
                    <Text style={{ color:C.sub, fontSize:FontSize.xs }}>
                      Base fare deducted: {fmtETB(LRT_BASE_FARE)} ETB
                    </Text>
                    <Text style={{ color:C.sub, fontSize:FontSize.xs }}>
                      Balance on exit after fare calculated
                    </Text>
                  </View>
                )}

                {/* QR token */}
                <View style={{ backgroundColor:'#fff', borderRadius:12, padding:12, marginTop:12, alignItems:'center' }}>
                  <Text style={{ color:'#666', fontSize:9, letterSpacing:1, fontWeight:'700',
                    textTransform:'uppercase', marginBottom:4 }}>Tap-in Token</Text>
                  <Text style={{ fontFamily:'Courier', color:'#222', fontWeight:'700', letterSpacing:2,
                    fontSize:13 }}>{lrtJourney.qrToken}</Text>
                </View>

                {lrtJourney.status === 'tapped-in' && (
                  <CButton title="Tap Out â†’" onPress={() => { setTapType('out'); setTapModal(true); }}
                    style={{ marginTop:12 }} />
                )}
              </View>
            )}

            {/* LRT line map */}
              <View style={{ margin:16, backgroundColor:C.surface, borderRadius:Radius.xl,
              borderWidth:1, borderColor:C.edge, padding:16 }}>
              {/* NS Line */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                 <Text style={{ color:C.green, fontSize:FontSize.sm, fontWeight:'700' }}>ðŸŸ¢ Northâ€“South Line</Text>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
                    <Text style={{ color: C.green, fontSize: 10, fontWeight: '700' }}>ONLINE</Text>
                 </View>
              </View>

              {LRT_STATIONS.NS.map((st, i) => {
                const trainAt = liveTransit.find(tr => tr.line === 'NS' && tr.stIdx === i);
                return (
                  <View key={st.id} style={{ flexDirection:'row', alignItems:'center', paddingVertical:8, borderBottomWidth: i === LRT_STATIONS.NS.length - 1 ? 0 : 1, borderBottomColor: C.edge + '40' }}>
                    <View style={{ width:12, height:12, borderRadius:6, borderWidth:2,
                      borderColor: st.isInterchange ? C.amber : C.green,
                      backgroundColor: st.isInterchange ? C.amber : 'transparent',
                      marginRight:10 }} />
                    <View style={{ flex: 1 }}>
                       <Text style={{ color:C.text, fontWeight: st.isInterchange ? '700' : '400' }}>
                         {st.name} {st.isInterchange ? 'ðŸ”„' : ''}
                       </Text>
                       {trainAt && (
                         <Text style={{ color: C.green, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                           ðŸšŠ {trainAt.dir} ({Math.round(trainAt.occupancy * 100)}% full)
                         </Text>
                       )}
                    </View>
                    <Text style={{ color:C.sub, fontSize:FontSize.xs }}>{st.km} km</Text>
                  </View>
                );
              })}

              {/* EW Line */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
                 <Text style={{ color:C.blue, fontSize:FontSize.sm, fontWeight:'700' }}>ðŸ”µ Eastâ€“West Line</Text>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
                    <Text style={{ color: C.green, fontSize: 10, fontWeight: '700' }}>ONLINE</Text>
                 </View>
              </View>

              {LRT_STATIONS.EW.map((st, i) => {
                const trainAt = liveTransit.find(tr => tr.line === 'EW' && tr.stIdx === i);
                return (
                  <View key={st.id} style={{ flexDirection:'row', alignItems:'center', paddingVertical:8, borderBottomWidth: i === LRT_STATIONS.EW.length - 1 ? 0 : 1, borderBottomColor: C.edge + '40' }}>
                    <View style={{ width:12, height:12, borderRadius:6, borderWidth:2,
                      borderColor: st.isInterchange ? C.amber : C.blue,
                      backgroundColor: st.isInterchange ? C.amber : 'transparent',
                      marginRight:10 }} />
                    <View style={{ flex: 1 }}>
                       <Text style={{ color:C.text, fontWeight: st.isInterchange ? '700' : '400' }}>
                         {st.name} {st.isInterchange ? 'ðŸ”„' : ''}
                       </Text>
                       {trainAt && (
                         <Text style={{ color: C.blue, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                           ðŸšŠ {trainAt.dir} ({Math.round(trainAt.occupancy * 100)}% full)
                         </Text>
                       )}
                    </View>
                    <Text style={{ color:C.sub, fontSize:FontSize.xs }}>{st.km} km</Text>
                  </View>
                );
              })}
            </View>

            {/* Fare calculator */}
            <View style={{ marginHorizontal:16, backgroundColor:'rgba(10,30,18,1)', borderRadius:Radius.xl,
              borderWidth:1, borderColor:'rgba(0,168,107,0.2)', padding:16, marginBottom:16 }}>
              <Text style={{ color:C.green, fontSize:FontSize.sm, fontWeight:'700',
                textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Fare Calculator</Text>
              <View style={{ flexDirection:'row', gap:8, marginBottom:10 }}>
                <View style={{ flex:1 }}>
                  <Text style={{ color:C.sub, fontSize:FontSize.xs, marginBottom:4 }}>From</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection:'row', gap:6 }}>
                      {allStations.map((s) => (
                        <TouchableOpacity key={s.id} onPress={() => setSelectedOrigin(s)}
                          style={{ paddingHorizontal:10, paddingVertical:5, borderRadius:20,
                            backgroundColor: selectedOrigin?.id===s.id ? C.greenL : C.lift,
                            borderWidth:1, borderColor: selectedOrigin?.id===s.id ? C.green : C.edge2 }}>
                          <Text style={{ fontSize:FontSize.xs, fontWeight:'600',
                            color: selectedOrigin?.id===s.id ? C.green : C.sub }}>{s.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
              {selectedOrigin && selectedExit && (
                <View style={{ backgroundColor:'rgba(0,168,107,0.08)', borderRadius:Radius.lg, padding:12, marginTop:8 }}>
                  <Text style={{ color:C.sub, fontSize:FontSize.xs }}>Estimated fare</Text>
                  <Text style={{ color:C.green, fontSize:FontSize['2xl'], fontWeight:'800', marginTop:2 }}>
                    {fmtETB(calcLrtFare(selectedOrigin.km, selectedExit.km))} ETB
                  </Text>
                </View>
              )}
            </View>

            {/* Tap In button */}
            {!lrtJourney || lrtJourney.status === 'completed' ? (
              <View style={{ paddingHorizontal:16 }}>
                <CButton title="ðŸš‡ Tap In" onPress={() => { setTapType('in'); setTapModal(true); }}
                  size="lg" />
              </View>
            ) : null}
          </>
        )}

        {/* â”€â”€ EDR TAB â”€â”€ */}
        {tab === 'edr' && (
          <>
            <SectionTitle title="Ethio-Djibouti Railway" />
            <View style={{ marginHorizontal:16, marginBottom:12, padding:14, backgroundColor:C.surface,
              borderRadius:Radius.xl, borderWidth:1, borderColor:C.edge }}>
              <Text style={{ color:C.sub, fontSize:FontSize.md, lineHeight:20 }}>
                ðŸš‚ Book intercity rail tickets on the Ethio-Djibouti Railway connecting Addis Ababa to Djibouti City.
              </Text>
            </View>

            {EDR_TRAINS.filter((t) => !edrTo || t.to === edrTo).map((train) => (
              <TouchableOpacity key={train.id} onPress={() => { setSelectedTrain(train); setEdrBookingModal(true); }}
                style={{ marginHorizontal:16, marginBottom:10, borderRadius:Radius.xl,
                  borderWidth:1, borderColor:C.edge, overflow:'hidden' }}>
                <View style={{ padding:14, backgroundColor:'rgba(26,18,0,0.8)' }}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <View>
                      <Text style={{ color:C.amber, fontSize:FontSize.xl, fontWeight:'800' }}>
                        {train.departs} â†’ {train.arrives}
                      </Text>
                      <Text style={{ color:C.text, fontSize:FontSize.md, marginTop:2 }}>
                        {train.from}
                      </Text>
                      <Text style={{ color:C.sub, fontSize:FontSize.md }}>â†’ {train.to}</Text>
                    </View>
                    <View style={{ alignItems:'flex-end' }}>
                      <Text style={{ color:C.amber, fontSize:FontSize['2xl'], fontWeight:'800' }}>
                        {fmtETB(train.price, 0)}
                      </Text>
                      <Text style={{ color:C.sub, fontSize:FontSize.xs }}>ETB</Text>
                      <View style={{ marginTop:6, paddingHorizontal:8, paddingVertical:3,
                        borderRadius:6, backgroundColor: train.class==='1st Class' ? 'rgba(212,160,23,0.15)'
                          : train.class==='Sleeper' ? 'rgba(139,92,246,0.15)' : 'rgba(45,126,240,0.12)',
                        borderWidth:1, borderColor: train.class==='1st Class' ? 'rgba(212,160,23,0.3)'
                          : train.class==='Sleeper' ? 'rgba(139,92,246,0.3)' : 'rgba(45,126,240,0.2)' }}>
                        <Text style={{ fontSize:FontSize.xs, fontWeight:'700',
                          color: train.class==='1st Class' ? C.gold
                            : train.class==='Sleeper' ? C.purple : C.blue }}>
                          {train.class}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ flexDirection:'row', alignItems:'center', marginTop:10, gap:6 }}>
                    <Text style={{ color:C.sub, fontSize:FontSize.xs }}>
                      ðŸª‘ {train.seats} seats available
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Tap in/out modal */}
      <Modal visible={tapModal} transparent animationType="slide">
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)' }} onPress={() => setTapModal(false)} />
        <View style={{ backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24,
          padding:24, paddingBottom:40 }}>
          <Text style={{ color:C.text, fontSize:FontSize['2xl'], fontWeight:'800', marginBottom:16 }}>
            {tapType === 'in' ? 'ðŸš‡ Select Boarding Station' : 'ðŸš‰ Select Exit Station'}
          </Text>
          <ScrollView style={{ maxHeight:300 }}>
            {allStations.map((st) => (
              <TouchableOpacity key={st.id}
                onPress={() => {
                  if (tapType==='in') {
                    // Pass station directly â€” do NOT call setSelectedOrigin first
                    // (state update is async; handleTapIn would read stale null)
                    handleTapIn(st);
                  } else {
                    setSelectedExit(st);
                  }
                }}
                style={{ paddingVertical:14, paddingHorizontal:4, borderBottomWidth:1, borderBottomColor:C.edge,
                  flexDirection:'row', alignItems:'center', gap:10 }}>
                <View style={{ width:10, height:10, borderRadius:5, borderWidth:2,
                  borderColor: st.id.startsWith('ns') ? C.green : C.blue }} />
                <Text style={{ color:C.text, fontSize:FontSize.lg, flex:1 }}>{st.name}</Text>
                {st.isInterchange && <Text style={{ color:C.amber, fontSize:FontSize.xs, fontWeight:'700' }}>INTERCHANGE</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
          {tapType === 'out' && selectedExit && (
            <CButton title={`Tap Out â†’ ${fmtETB(calcLrtFare(
              allStations.find((s)=>s.id===lrtJourney?.originId)?.km||0, selectedExit.km))} ETB`}
              onPress={handleTapOut} style={{ marginTop:16 }} />
          )}
        </View>
      </Modal>

      {/* EDR booking modal */}
      <Modal visible={edrBookingModal} transparent animationType="slide">
        <Pressable style={{ flex:1, backgroundColor:'rgba(0,0,0,0.6)' }} onPress={() => setEdrBookingModal(false)} />
        <View style={{ backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24,
          padding:24, paddingBottom:40 }}>
          {selectedTrain && (
            <>
              <Text style={{ color:C.text, fontSize:FontSize['2xl'], fontWeight:'800', marginBottom:4 }}>
                Book EDR Ticket
              </Text>
              <Text style={{ color:C.sub, marginBottom:20 }}>
                {selectedTrain.from} â†’ {selectedTrain.to}
              </Text>
              {[
                ['Departure', selectedTrain.departs],
                ['Arrival', selectedTrain.arrives],
                ['Class', selectedTrain.class],
                ['Seats Available', selectedTrain.seats],
                ['Price', `${fmtETB(selectedTrain.price, 0)} ETB`],
                ['Your Balance', `${fmtETB(balance, 0)} ETB`],
              ].map(([k,v]) => (
                <View key={k} style={{ flexDirection:'row', justifyContent:'space-between',
                  paddingVertical:8, borderBottomWidth:1, borderBottomColor:C.edge }}>
                  <Text style={{ color:C.sub }}>{k}</Text>
                  <Text style={{ color:C.text, fontWeight:'700' }}>{v}</Text>
                </View>
              ))}
              <CButton title={`Book â€” ${fmtETB(selectedTrain.price, 0)} ETB`}
                onPress={() => handleEdrBook(selectedTrain)} style={{ marginTop:20 }} />
              <CButton title="Cancel" onPress={() => setEdrBookingModal(false)} variant="ghost"
                style={{ marginTop:8 }} />
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}
