/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Contracts from './pages/Contracts';
import ContractForm from './pages/ContractForm';
import ContractView from './pages/ContractView';
import SmartContractEditor from './pages/SmartContractEditor';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/new" element={<ContractForm />} />
          <Route path="smart-editor" element={<SmartContractEditor />} />
          <Route path="contracts/:id/edit" element={<ContractForm />} />
          <Route path="contracts/:id" element={<ContractView />} />
        </Route>
      </Routes>
    </Router>
  );
}

