import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import IDEPage from "@/pages/IDEPage/IDEPage";
import NotFoundPage from "@/pages/NotFoundPage/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/ide" replace />} />
        <Route path="ide" element={<IDEPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
