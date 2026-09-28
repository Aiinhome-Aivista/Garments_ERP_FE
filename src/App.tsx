import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { StitchLoader } from "./components/Loaders";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Logistics from "./pages/Logistics";
import MasterList from "./pages/MasterList";
import Planning from "./pages/Planning";
import { RequisitionForm, Requisitions } from "./pages/Requisitions";
import Stock from "./pages/Stock";
import VoucherForm from "./pages/VoucherForm";
import VoucherList from "./pages/VoucherList";
import { useApp } from "./store";

export default function App() {
  const { user, meta, booting } = useApp();
  if (booting) return <StitchLoader full label="Opening the workshop…" />;
  if (!user || !meta) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="masters/:key" element={<MasterList />} />
        <Route path="vouchers/:doc" element={<VoucherList />} />
        <Route path="vouchers/:doc/new" element={<VoucherForm />} />
        <Route path="vouchers/:doc/:id" element={<VoucherForm />} />
        <Route path="planning" element={<Planning />} />
        <Route path="requisitions" element={<Requisitions />} />
        <Route path="requisitions/new" element={<RequisitionForm />} />
        <Route path="requisitions/:id" element={<RequisitionForm />} />
        <Route path="logistics" element={<Logistics />} />
        <Route path="stock" element={<Stock />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}
