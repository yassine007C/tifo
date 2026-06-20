import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import Login from "./pages/login";

createRoot(document.getElementById("root")!).render(<App />);
<Route path="/login" component={Login} /> 
// أو <Route path="/login" element={<Login />} /> حسب مكتبة التوجيه لديك
