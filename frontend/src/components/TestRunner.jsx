import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { testCases } from '../services/api';
import Dropdown from './Dropdown';

export default function TestRunner({ testCase, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepResults, setStepResults] = useState([]);
  const [overallResult, setOverallResult] = useState(null);
  const [failureReason, setFailureReason] = useState('');
  const [running, setRunning] = useState(false);
  const [stepModal, setStepModal] = useState({ step: null, result: 'pass', actualResult: '', evidence: '', evidenceType: 'text', evidenceFile: null });
  const [showBugForm, setShowBugForm] = useState(false);
  const [bugReport, setBugReport] = useState({ bugDescription: '', severity: 'medium', screenshot: '', additionalNotes: '' });
  const [screenshotFile, setScreenshotFile] = useState(null);
  const screenshotRef = useRef(null);
  const fileRef = useRef(null);

  const steps = testCase?.steps || [];
  const allDone = stepResults.length === steps.length;

  const handleStepResult = (stepIndex, passed) => {
    const step = steps[stepIndex];
    setStepModal({ step, index: stepIndex, result: passed ? 'pass' : 'fail', actualResult: '', evidence: '', evidenceType: 'text', evidenceFile: null });
  };

  const confirmStep = async () => {
    const { index, result, actualResult, evidenceType, evidenceFile } = stepModal;
    let evidence = stepModal.evidence;
    if (evidenceType === 'file' && evidenceFile) {
      try {
        const fd = new FormData();
        fd.append('file', evidenceFile);
        const uploadRes = await testCases.uploadAttachment(testCase._id, fd);
        const att = uploadRes.data.attachments;
        if (att?.length) evidence = `/uploads/${att[att.length - 1].filename}`;
      } catch (e) {}
    }
    const newResults = [...stepResults];
    newResults[index] = { stepId: steps[index]._id, status: result === 'pass' ? 'pass' : 'fail', actualResult, evidence, evidenceType };
    setStepResults(newResults);
    setStepModal({ step: null, result: 'pass', actualResult: '', evidence: '', evidenceType: 'text', evidenceFile: null });
    if (newResults.length === steps.length) {
      const hasFail = newResults.some(r => r.status === 'fail');
      if (hasFail) setOverallResult('failed');
      else setOverallResult('passed');
    } else {
      setCurrentStep(index + 1);
    }
  };

  const skipStep = () => {
    const newResults = [...stepResults];
    newResults.push({ stepId: steps[currentStep]._id, status: 'skip', actualResult: 'Skipped' });
    setStepResults(newResults);
    if (newResults.length === steps.length) {
      setOverallResult('passed');
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async () => {
    if (!overallResult) return;
    if (overallResult === 'failed') {
      setShowBugForm(true);
      return;
    }
    await doSubmit({});
  };

  const doSubmit = async (bugData) => {
    setRunning(true);
    try {
      let screenshotUrl = '';
      if (screenshotFile) {
        try {
          const fd = new FormData();
          fd.append('file', screenshotFile);
          const uploadRes = await testCases.uploadAttachment(testCase._id, fd);
          const att = uploadRes.data.attachments;
          if (att?.length) screenshotUrl = `/uploads/${att[att.length - 1].filename}`;
        } catch (e) { /* screenshot upload failed — proceed without it */ }
      }
      const failedStepEvidence = stepResults
        .filter(r => r.status === 'fail' && r.evidence && r.evidenceType === 'file')
        .map(r => r.evidence);
      const finalScreenshot = screenshotUrl || failedStepEvidence[0] || '';
      await testCases.execute(testCase._id, {
        stepResults,
        overallResult,
        failureReason: overallResult === 'failed' ? failureReason || bugData.bugDescription || 'Test failed' : '',
        screenshot: finalScreenshot,
        bugReport: overallResult === 'failed' ? { ...bugData, screenshot: finalScreenshot } : undefined,
      });
      toast.success(overallResult === 'passed' ? 'Test passed!' : 'Bug reported successfully');
      setShowBugForm(false);
      onComplete();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to submit test results';
      toast.error(msg);
      console.error('Execute error:', msg);
    }
    setRunning(false);
  };

  const handleRetest = async () => {
    setRunning(true);
    try {
      await testCases.retest(testCase._id);
      toast.success('Test reset — ready for retesting');
      onComplete();
      onClose();
    } catch (e) { toast.error('Retest failed'); }
    setRunning(false);
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000}} onClick={onClose}>
      <div className="card" style={{maxWidth:560,width:'90%',maxHeight:'90vh',display:'flex',flexDirection:'column'}} onClick={e => e.stopPropagation()}>
        <div style={{padding:'14px 16px',borderBottom:'0.5px solid #e5e7eb'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div style={{fontSize:13,fontWeight:700,color:'#111827'}}>▶ Test Runner</div>
            <span onClick={onClose} style={{cursor:'pointer',color:'#9ca3af',fontSize:14}}>✕</span>
          </div>
          <div style={{fontSize:12,fontWeight:600,color:'#111827'}}>{testCase.testCaseId} — {testCase.title}</div>
          {testCase.precondition && <div style={{fontSize:10,color:'#6b7280',marginTop:4}}>Precondition: {testCase.precondition}</div>}
        </div>

        <div style={{padding:'14px 16px',overflowY:'auto',flex:1}}>
          <div style={{display:'flex',gap:4,marginBottom:14}}>
            {steps.map((_, i) => (
              <div key={i} style={{
                flex:1,height:4,borderRadius:4,
                background: stepResults[i]?.status === 'fail' ? '#ef4444'
                  : stepResults[i] ? '#22c55e'
                  : i === currentStep ? '#2347e8'
                  : '#e5e7eb'
              }} />
            ))}
          </div>

          {!allDone && stepModal.step === null && (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {steps.map((step, i) => (
                <div key={step._id || i} style={{
                  background: i === currentStep ? '#f0f4ff' : '#f9fafb',
                  border: `0.5px solid ${i === currentStep ? '#2347e8' : '#e5e7eb'}`,
                  borderRadius:8,padding:'10px 12px',
                  opacity: stepResults[i] ? 0.6 : 1,
                }}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:600,color:'#111827'}}>Step {step.order}</div>
                      <div style={{fontSize:11,color:'#374151',marginTop:2}}>{step.description}</div>
                      {step.expectedResult && <div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>Expected: {step.expectedResult}</div>}
                    </div>
                    <div style={{display:'flex',gap:4,flexShrink:0,marginLeft:10}}>
                      {i === currentStep && !stepResults[i] && (
                        <>
                          <button className="btn btn-green" style={{fontSize:9,padding:'3px 8px'}} onClick={() => handleStepResult(i, true)}>✅ Pass</button>
                          <button className="btn btn-red" style={{fontSize:9,padding:'3px 8px'}} onClick={() => handleStepResult(i, false)}>❌ Fail</button>
                          <button className="btn btn-gray" style={{fontSize:9,padding:'3px 8px'}} onClick={skipStep}>⏭ Skip</button>
                        </>
                      )}
                      {stepResults[i] && (
                        <span style={{fontSize:10,fontWeight:600,color: stepResults[i].status === 'pass' ? '#15803d' : stepResults[i].status === 'fail' ? '#b91c1c' : '#9ca3af'}}>
                          {stepResults[i].status === 'pass' ? '✅' : stepResults[i].status === 'fail' ? '❌' : '⏭'} {stepResults[i].status}
                        </span>
                      )}
                    </div>
                  </div>
                  {stepResults[i]?.evidence && stepResults[i]?.evidenceType === 'file' && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(stepResults[i].evidence) && (
                    <div style={{marginTop:6}}>
                      <img src={stepResults[i].evidence} alt="evidence" style={{maxWidth:120,maxHeight:60,borderRadius:4,border:'0.5px solid #e5e7eb',cursor:'pointer'}} onClick={() => window.open(stepResults[i].evidence)} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {stepModal.step && (
            <div style={{background:'#f9fafb',border:'0.5px solid #e5e7eb',borderRadius:8,padding:12}}>
              <div style={{fontSize:12,fontWeight:600,color:'#111827',marginBottom:8}}>
                Step {stepModal.step.order}: {stepModal.result === 'pass' ? '✅ Pass' : '❌ Fail'}
              </div>
              <div style={{fontSize:11,color:'#374151',marginBottom:10}}>{stepModal.step.description}</div>
              <div style={{marginBottom:8}}>
                <label style={{fontSize:10,fontWeight:500,color:'#6b7280',display:'block',marginBottom:3}}>Actual Result</label>
                <textarea value={stepModal.actualResult}
                  onChange={e => setStepModal({...stepModal, actualResult: e.target.value})}
                  style={{width:'100%',padding:'6px 8px',border:'0.5px solid #e5e7eb',borderRadius:5,fontSize:11,background:'white',outline:'none',minHeight:50,fontFamily:'inherit'}}
                  placeholder={stepModal.result === 'fail' ? 'Describe what actually happened...' : 'Actual result (optional)'} />
              </div>
              <div style={{marginBottom:10}}>
                <label style={{fontSize:10,fontWeight:500,color:'#6b7280',display:'block',marginBottom:3}}>Evidence (optional)</label>
                <div style={{display:'flex',gap:4,marginBottom:4}}>
                  <button onClick={() => setStepModal({...stepModal, evidenceType: 'text', evidence: '', evidenceFile: null})}
                    style={{fontSize:9,padding:'3px 8px',borderRadius:4,border:'none',cursor:'pointer',background:stepModal.evidenceType === 'text' ? '#2347e8' : '#f3f4f6',color:stepModal.evidenceType === 'text' ? 'white' : '#374151',fontWeight:500}}>
                    📝 Text / Log
                  </button>
                  <button onClick={() => setStepModal({...stepModal, evidenceType: 'file', evidence: '', evidenceFile: null})}
                    style={{fontSize:9,padding:'3px 8px',borderRadius:4,border:'none',cursor:'pointer',background:stepModal.evidenceType === 'file' ? '#2347e8' : '#f3f4f6',color:stepModal.evidenceType === 'file' ? 'white' : '#374151',fontWeight:500}}>
                    🖼️ Import Photo
                  </button>
                </div>
                {stepModal.evidenceType === 'text' ? (
                  <input value={stepModal.evidence}
                    onChange={e => setStepModal({...stepModal, evidence: e.target.value})}
                    style={{width:'100%',padding:'6px 8px',border:'0.5px solid #e5e7eb',borderRadius:5,fontSize:11,background:'white',outline:'none'}}
                    placeholder="Link to screenshot, log, etc." />
                ) : (
                  <>
                    <input ref={fileRef} type="file" accept="image/*,.pdf,.log,.txt"
                      onChange={e => { const f = e.target.files[0]; setStepModal({...stepModal, evidenceFile: f, evidence: f ? f.name : ''}); }}
                      style={{width:'100%',padding:'4px 8px',fontSize:11,border:'0.5px solid #e5e7eb',borderRadius:5,background:'white',outline:'none'}} />
                    {stepModal.evidenceFile && (
                      <div style={{marginTop:4}}>
                        {stepModal.evidenceFile.type?.startsWith('image/') ? (
                          <img src={URL.createObjectURL(stepModal.evidenceFile)} alt="evidence" style={{maxWidth:'100%',maxHeight:100,borderRadius:4,border:'0.5px solid #e5e7eb'}} />
                        ) : (
                          <div style={{fontSize:10,color:'#6b7280'}}>Selected: {stepModal.evidenceFile.name}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-blue" onClick={confirmStep}>Confirm</button>
                <button className="btn btn-gray" onClick={() => setStepModal({...stepModal, result: stepModal.result === 'pass' ? 'fail' : 'pass'})}>
                  Switch to {stepModal.result === 'pass' ? 'Fail' : 'Pass'}
                </button>
              </div>
            </div>
          )}

          {allDone && !showBugForm && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{background:'#f9fafb',border:'0.5px solid #e5e7eb',borderRadius:8,padding:12}}>
                <div style={{fontSize:12,fontWeight:600,color:'#111827',marginBottom:8}}>All steps completed!</div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={() => setOverallResult('passed')}
                    className="btn" style={{
                      background: overallResult === 'passed' ? '#22c55e' : '#f3f4f6',
                      color: overallResult === 'passed' ? 'white' : '#374151',
                      border: overallResult === 'passed' ? 'none' : '0.5px solid #e5e7eb',
                    }}>✅ Overall Pass</button>
                  <button onClick={() => setOverallResult('failed')}
                    className="btn" style={{
                      background: overallResult === 'failed' ? '#ef4444' : '#f3f4f6',
                      color: overallResult === 'failed' ? 'white' : '#374151',
                      border: overallResult === 'failed' ? 'none' : '0.5px solid #e5e7eb',
                    }}>❌ Overall Fail</button>
                </div>
              </div>
              {overallResult === 'failed' && (
                <div>
                  <label style={{fontSize:10,fontWeight:500,color:'#6b7280',display:'block',marginBottom:3}}>Failure Reason</label>
                  <textarea value={failureReason}
                    onChange={e => setFailureReason(e.target.value)}
                    style={{width:'100%',padding:'6px 8px',border:'0.5px solid #e5e7eb',borderRadius:5,fontSize:11,background:'white',outline:'none',minHeight:50,fontFamily:'inherit'}}
                    placeholder="Describe what went wrong..." />
                </div>
              )}
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-blue" disabled={!overallResult || running} onClick={handleSubmit}>
                  {running ? 'Submitting...' : '📊 Submit Results'}
                </button>
                <button className="btn btn-gray" onClick={() => { setStepResults([]); setCurrentStep(0); setOverallResult(null); setFailureReason(''); }}>
                  🔄 Redo All Steps
                </button>
              </div>
            </div>
          )}

          {/* Bug report popup */}
          {showBugForm && (
            <div style={{
              position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001,
              animation:'fadeIn 300ms',
            }} onClick={() => setShowBugForm(false)}>
              <div style={{
                width:520,background:'white',borderRadius:12,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',overflow:'hidden',
                animation:'scaleIn 300ms',
              }} onClick={e => e.stopPropagation()}>
                <div style={{background:'#1E3A5F',padding:'14px 24px'}}>
                  <div style={{fontSize:14,fontWeight:700,color:'white'}}>Report Bug for {testCase.title} — {testCase.testCaseId}</div>
                </div>
                <div style={{padding:24}}>
                  <div style={{marginBottom:12,fontSize:10,color:'#6b7280',fontStyle:'italic'}}>
                    A test step failed. Please provide details below to create a bug report.
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:11,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>Bug Description <span style={{color:'#ef4444'}}>*</span></label>
                    <textarea value={bugReport.bugDescription}
                      onChange={e => setBugReport({...bugReport, bugDescription: e.target.value})}
                      style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:6,fontSize:11,background:'white',outline:'none',minHeight:60,fontFamily:'inherit'}}
                      placeholder="Describe what went wrong..." required />
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:11,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>Severity <span style={{color:'#ef4444'}}>*</span></label>
                    <Dropdown value={bugReport.severity}
                      onChange={v => setBugReport({...bugReport, severity: v})}
                      options={[{value:'critical', label:'Critical'}, {value:'high', label:'High'}, {value:'medium', label:'Medium'}, {value:'low', label:'Low'}]} />
                  </div>
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:11,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>Screenshot</label>
                    <input ref={screenshotRef} type="file" accept="image/*,.pdf"
                      onChange={e => { const f = e.target.files[0]; setScreenshotFile(f); if (f) { setBugReport({...bugReport, screenshot: URL.createObjectURL(f)}); } }}
                      style={{width:'100%',padding:'5px 10px',fontSize:11,border:'0.5px solid #e5e7eb',borderRadius:6,background:'white',outline:'none'}} />
                    {screenshotFile && (
                      <img src={bugReport.screenshot} alt="preview" style={{marginTop:6,maxHeight:80,borderRadius:4,border:'0.5px solid #e5e7eb'}} />
                    )}
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={{fontSize:11,fontWeight:600,color:'#374151',display:'block',marginBottom:4}}>Additional Notes</label>
                    <textarea value={bugReport.additionalNotes}
                      onChange={e => setBugReport({...bugReport, additionalNotes: e.target.value})}
                      style={{width:'100%',padding:'8px 10px',border:'0.5px solid #e5e7eb',borderRadius:6,fontSize:11,background:'white',outline:'none',minHeight:40,fontFamily:'inherit'}}
                      placeholder="Optional notes..." />
                  </div>
                  <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                    <button className="btn btn-gray" onClick={() => { setShowBugForm(false); setOverallResult(null); }}>
                      Skip & Close
                    </button>
                    <button className="btn btn-outline" onClick={async () => {
                      setShowBugForm(false);
                      setRunning(true);
                      try {
                        await testCases.retest(testCase._id);
                        toast.success('Test reset for retry');
                        onComplete();
                        onClose();
                      } catch(e) { toast.error('Retest failed'); }
                      setRunning(false);
                    }}>
                      🔄 Re-run Test
                    </button>
                    <button className="btn btn-blue" disabled={!bugReport.bugDescription.trim() || running}
                      onClick={() => doSubmit({ ...bugReport, actualResult: failureReason })}>
                      {running ? 'Submitting...' : '🐛 Submit Bug Report'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {testCase.status === 'failed' && !allDone && (
            <div style={{marginTop:12,paddingTop:10,borderTop:'0.5px solid #e5e7eb'}}>
              <button className="btn btn-amber" disabled={running} onClick={handleRetest}>🔄 Reset & Retest</button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}