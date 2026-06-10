import { useState } from 'react';
import toast from 'react-hot-toast';
import { testCases } from '../services/api';

export default function TestRunner({ testCase, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepResults, setStepResults] = useState([]);
  const [overallResult, setOverallResult] = useState(null);
  const [failureReason, setFailureReason] = useState('');
  const [running, setRunning] = useState(false);
  const [stepModal, setStepModal] = useState({ step: null, result: 'pass', actualResult: '', evidence: '' });

  const steps = testCase?.steps || [];
  const allDone = stepResults.length === steps.length;

  const handleStepResult = (stepIndex, passed) => {
    const step = steps[stepIndex];
    setStepModal({ step, index: stepIndex, result: passed ? 'pass' : 'fail', actualResult: '', evidence: '' });
  };

  const confirmStep = () => {
    const { index, result, actualResult, evidence } = stepModal;
    const newResults = [...stepResults];
    newResults[index] = { stepId: steps[index]._id, status: result === 'pass' ? 'pass' : 'fail', actualResult, evidence };
    setStepResults(newResults);
    setStepModal({ step: null, result: 'pass', actualResult: '', evidence: '' });
    if (newResults.length === steps.length) {
      const hasFail = newResults.some(r => r.status === 'fail');
      if (hasFail) setOverallResult('failed');
      else setOverallResult('passed');
    } else if (result === 'pass') {
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
    setRunning(true);
    try {
      await testCases.execute(testCase._id, {
        stepResults,
        overallResult,
        failureReason: overallResult === 'failed' ? failureReason || 'Test failed' : '',
      });
      toast.success(overallResult === 'passed' ? 'Test passed!' : 'Test failed — bug auto-created');
      onComplete();
      onClose();
    } catch (e) {
      toast.error('Failed to submit test results');
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
        {/* Header */}
        <div style={{padding:'14px 16px',borderBottom:'0.5px solid #e5e7eb'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div style={{fontSize:13,fontWeight:700,color:'#111827'}}>▶ Test Runner</div>
            <span onClick={onClose} style={{cursor:'pointer',color:'#9ca3af',fontSize:14}}>✕</span>
          </div>
          <div style={{fontSize:12,fontWeight:600,color:'#111827'}}>{testCase.testCaseId} — {testCase.title}</div>
          {testCase.precondition && <div style={{fontSize:10,color:'#6b7280',marginTop:4}}>Precondition: {testCase.precondition}</div>}
        </div>

        {/* Body */}
        <div style={{padding:'14px 16px',overflowY:'auto',flex:1}}>
          {/* Progress bar */}
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
                </div>
              ))}
            </div>
          )}

          {/* Step result modal */}
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
                <input value={stepModal.evidence}
                  onChange={e => setStepModal({...stepModal, evidence: e.target.value})}
                  style={{width:'100%',padding:'6px 8px',border:'0.5px solid #e5e7eb',borderRadius:5,fontSize:11,background:'white',outline:'none'}}
                  placeholder="Link to screenshot, log, etc." />
              </div>
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-blue" onClick={confirmStep}>Confirm</button>
                <button className="btn btn-gray" onClick={() => setStepModal({...stepModal, result: stepModal.result === 'pass' ? 'fail' : 'pass'})}>
                  Switch to {stepModal.result === 'pass' ? 'Fail' : 'Pass'}
                </button>
              </div>
            </div>
          )}

          {/* All done — overall result */}
          {allDone && (
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

          {/* Retest for already-failed */}
          {testCase.status === 'failed' && !allDone && (
            <div style={{marginTop:12,paddingTop:10,borderTop:'0.5px solid #e5e7eb'}}>
              <button className="btn btn-amber" disabled={running} onClick={handleRetest}>🔄 Reset & Retest</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
