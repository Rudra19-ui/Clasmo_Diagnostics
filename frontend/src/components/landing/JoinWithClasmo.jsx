import { useState } from 'react';
import LandingBrandTitle from './LandingBrandTitle';
import { api } from '../../services/api';

const BRANCHES = ['MUMBAI', 'PUNE', 'NASHIK', 'DHULE', 'RATNAGIRI'];

const EMPTY_FRANCHISE = {
  partnershipType: 'brand',
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  city: '',
  fullAddress: '',
  pincode: '',
  proofOfAddress: '',
};

const EMPTY_JOB = {
  branch: '',
  name: '',
  experienceType: 'fresher',
  currentEmployer: '',
  phone: '',
  email: '',
  city: '',
  totalExperience: '',
  lastSalary: '',
};

export default function JoinWithClasmo({ onClose }) {
  const [step, setStep] = useState(null);
  const [franchise, setFranchise] = useState(EMPTY_FRANCHISE);
  const [job, setJob] = useState(EMPTY_JOB);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const setFranchiseField = (field) => (event) => {
    setFranchise((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const setJobField = (field) => (event) => {
    setJob((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const resetAndChoose = (nextStep) => {
    setError('');
    setSubmitted(false);
    setStep(nextStep);
  };

  const buildFranchiseFormData = () => {
    const formData = new FormData();
    formData.append('request_type', 'franchise');
    formData.append('partnership_type', franchise.partnershipType);
    formData.append('name', franchise.name.trim());
    formData.append('organization', franchise.name.trim());
    formData.append('contact_person', franchise.contactPerson.trim());
    formData.append('phone', franchise.phone.trim());
    formData.append('email', franchise.email.trim());
    formData.append('city', franchise.city.trim());
    formData.append('full_address', franchise.fullAddress.trim());
    formData.append('pincode', franchise.pincode.trim());
    formData.append('proof_of_address', franchise.proofOfAddress.trim());
    return formData;
  };

  const buildJobFormData = () => {
    const formData = new FormData();
    formData.append('request_type', 'job');
    formData.append('branch', job.branch);
    formData.append('name', job.name.trim());
    formData.append('experience_type', job.experienceType);
    formData.append('current_employer', job.currentEmployer.trim());
    formData.append('organization', job.currentEmployer.trim());
    formData.append('phone', job.phone.trim());
    formData.append('email', job.email.trim());
    formData.append('city', job.city.trim());
    formData.append('total_experience', job.totalExperience.trim());
    formData.append('last_salary', job.lastSalary.trim());
    return formData;
  };

  const handleFranchiseSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.submitJoinRequestForm(buildFranchiseFormData());
      setSubmitted(true);
      setFranchise(EMPTY_FRANCHISE);
    } catch (err) {
      setError(err.message || 'Unable to submit franchise application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJobSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.submitJoinRequestForm(buildJobFormData());
      setSubmitted(true);
      setJob(EMPTY_JOB);
    } catch (err) {
      setError(err.message || 'Unable to submit job application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="join-form" className="landing-join-form-section join-clasmo-section">
      <div className="join-clasmo-header">
        <LandingBrandTitle showLogo compact variant="join" />
        <h2 className="join-clasmo-title">COME N JOIN WITH CLASMO</h2>
      </div>

      {submitted ? (
        <div className="landing-join-form-card join-clasmo-success-card">
          <div className="landing-join-success">
            <p>Thank you! Your application has been submitted.</p>
            <p>Our team will contact you soon.</p>
          </div>
          <div className="join-clasmo-actions">
            <button type="button" className="btn-test-quorum" onClick={() => { setSubmitted(false); setStep(null); }}>
              Submit Another
            </button>
            <button type="button" className="landing-join-cancel" onClick={onClose}>Close</button>
          </div>
        </div>
      ) : step === null ? (
        <div className="join-clasmo-choice-grid">
          <button type="button" className="join-clasmo-choice-card" onClick={() => resetAndChoose('franchise')}>
            <span className="join-clasmo-choice-badge">A</span>
            <h3>FRANCHISE</h3>
            <p>Register as a CLASMO Brand Partner or Self-Operated Lab.</p>
          </button>
          <button type="button" className="join-clasmo-choice-card" onClick={() => resetAndChoose('job')}>
            <span className="join-clasmo-choice-badge">B</span>
            <h3>JOB VACANCY</h3>
            <p>Apply for a position at an existing CLASMO branch.</p>
          </button>
        </div>
      ) : step === 'franchise' ? (
        <div className="landing-join-form-card join-clasmo-form-card">
          <button type="button" className="join-clasmo-back" onClick={() => setStep(null)}>← Back to options</button>
          <h3 className="join-clasmo-form-title">FRANCHISEE</h3>
          <p className="join-clasmo-form-subtitle">Register as a CLASMO Brand Partner or Self-Operated Lab.</p>

          <form className="join-clasmo-form" onSubmit={handleFranchiseSubmit}>
            <fieldset className="join-radio-group">
              <legend>Partnership type</legend>
              <label>
                <input
                  type="radio"
                  name="partnershipType"
                  value="brand"
                  checked={franchise.partnershipType === 'brand'}
                  onChange={setFranchiseField('partnershipType')}
                />
                Brand
              </label>
              <label>
                <input
                  type="radio"
                  name="partnershipType"
                  value="self"
                  checked={franchise.partnershipType === 'self'}
                  onChange={setFranchiseField('partnershipType')}
                />
                Self
              </label>
            </fieldset>

            <label>
              Name / Brand Name *
              <input type="text" value={franchise.name} onChange={setFranchiseField('name')} required placeholder="Enter name or brand name" />
            </label>
            <label>
              Contact Person *
              <input type="text" value={franchise.contactPerson} onChange={setFranchiseField('contactPerson')} required placeholder="Contact person name" />
            </label>
            <label>
              Contact Number *
              <input type="tel" value={franchise.phone} onChange={setFranchiseField('phone')} required placeholder="Mobile number" />
            </label>
            <label>
              Email
              <input type="email" value={franchise.email} onChange={setFranchiseField('email')} placeholder="Email address" />
            </label>
            <label>
              City *
              <input type="text" value={franchise.city} onChange={setFranchiseField('city')} required placeholder="City" />
            </label>
            <label>
              Full Address *
              <textarea rows={2} value={franchise.fullAddress} onChange={setFranchiseField('fullAddress')} required placeholder="Complete address" />
            </label>
            <label>
              Pincode *
              <input type="text" value={franchise.pincode} onChange={setFranchiseField('pincode')} required placeholder="Pincode" />
            </label>
            <label>
              Proof of Address / ID
              <input type="text" value={franchise.proofOfAddress} onChange={setFranchiseField('proofOfAddress')} placeholder="ID proof details" />
            </label>

            {error && <p className="landing-join-error">{error}</p>}
            <button type="submit" className="btn-landing-login landing-login-big join-clasmo-submit" disabled={submitting}>
              {submitting ? 'SUBMITTING…' : 'REGISTER AS FRANCHISEE'}
            </button>
          </form>
        </div>
      ) : (
        <div className="landing-join-form-card join-clasmo-form-card">
          <button type="button" className="join-clasmo-back" onClick={() => setStep(null)}>← Back to options</button>
          <h3 className="join-clasmo-form-title">JOB VACANCY</h3>
          <p className="join-clasmo-form-subtitle">Apply for a Position at an Existing CLASMO Branch.</p>

          <form className="join-clasmo-form" onSubmit={handleJobSubmit}>
            <label>
              Select Branch *
              <select value={job.branch} onChange={setJobField('branch')} required>
                <option value="">Choose branch</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </label>
            <label>
              Applicant Name *
              <input type="text" value={job.name} onChange={setJobField('name')} required placeholder="Your full name" />
            </label>
            <label>
              Fresher / Experienced *
              <select value={job.experienceType} onChange={setJobField('experienceType')} required>
                <option value="fresher">Fresher</option>
                <option value="experienced">Experienced</option>
              </select>
            </label>
            <label>
              Current Employer / Company Name
              <input type="text" value={job.currentEmployer} onChange={setJobField('currentEmployer')} placeholder="Current employer" />
            </label>
            <label>
              Contact Number *
              <input type="tel" value={job.phone} onChange={setJobField('phone')} required placeholder="Mobile number" />
            </label>
            <label>
              Email
              <input type="email" value={job.email} onChange={setJobField('email')} placeholder="Email address" />
            </label>
            <label>
              City
              <input type="text" value={job.city} onChange={setJobField('city')} placeholder="City" />
            </label>
            <label>
              Total Experience (in years)
              <input type="text" value={job.totalExperience} onChange={setJobField('totalExperience')} placeholder="Experience in years" />
            </label>
            <label>
              Last Salary Drawn
              <input type="text" value={job.lastSalary} onChange={setJobField('lastSalary')} placeholder="Last drawn salary" />
            </label>

            {error && <p className="landing-join-error">{error}</p>}
            <button type="submit" className="btn-landing-login landing-login-big join-clasmo-submit" disabled={submitting}>
              {submitting ? 'SUBMITTING…' : 'SUBMIT JOB APPLICATION'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
