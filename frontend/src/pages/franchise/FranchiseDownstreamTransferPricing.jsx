import { Navigate } from 'react-router-dom';
import FranchiseTransferPricingPanel from '../../components/franchise/FranchiseTransferPricingPanel';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/roles';

const MODE_BY_ROLE = {
  [ROLES.SUPER_FRANCHISEE]: 'supreme_prime',
  [ROLES.FRANCHISEE]: 'prime_sub',
};

export default function FranchiseDownstreamTransferPricing({ forcedRole }) {
  const { user } = useAuth();
  const role = forcedRole || user?.role;
  const mode = MODE_BY_ROLE[role];

  if (!mode) {
    return <Navigate to="/dashboard" replace />;
  }

  return <FranchiseTransferPricingPanel mode={mode} />;
}
