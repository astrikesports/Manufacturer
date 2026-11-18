import {
  BrowserRouter,
  Route,
  Routes
} from "react-router-dom";

import {
  Toaster
} from "react-hot-toast";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Quotation from "./pages/Quotation";
import MobileQuotation from "./pages/MobileQuotation";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {

  return (

    <BrowserRouter>

      <Toaster position="top-right" />

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mobile-quotation"
          element={
            <ProtectedRoute>
              <MobileQuotation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quotation"
          element={
            <ProtectedRoute>
              <Quotation />
            </ProtectedRoute>
          }
        />

      </Routes>

    </BrowserRouter>

  );

}
