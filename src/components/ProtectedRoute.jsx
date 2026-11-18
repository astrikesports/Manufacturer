import { Navigate } from "react-router-dom";

import LoaderOverlay from "../components/LoaderOverlay";

export default function ProtectedRoute({
  children
}) {

  // CHECK LOCAL USER
  const user =
    localStorage.getItem(
      "user"
    );

  // NO LOGIN
  if (!user) {

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // ACCESS
  return children;
}
