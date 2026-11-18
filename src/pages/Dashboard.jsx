import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import AdminDashboard from "./AdminDashboard";

import SalesTeamDashboard from "./SalesTeamDashboard";

import LoaderOverlay from "../components/LoaderOverlay";

export default function Dashboard() {

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);

  useEffect(() => {

    const storedUser = localStorage.getItem("user");

    // NO USER
    if (!storedUser) {

      navigate("/login");

      return;
    }

    // PARSE USER
    const parsedUser = JSON.parse(storedUser);

    setUser(parsedUser);

    setLoading(false);

  }, []);

  // LOADING
  if (loading) {

    return (
      <LoaderOverlay text="Loading Dashboard..." />
    );
  }

  // ADMIN
  if (user?.role === "admin") {

    return <AdminDashboard />;
  }

  // SALES
  return <SalesTeamDashboard />;
}
