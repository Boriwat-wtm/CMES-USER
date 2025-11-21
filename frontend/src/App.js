import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./Register";
import Home from "./Home";
import Select from "./Select";
import Upload from "./Upload";
import Status from "./Status";
import Payment from "./Payment";
import Profile from "./Profile";
import Report from "./Report";
import Gift from "./Gift";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/select" element={<Select />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/status" element={<Status />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/report" element={<Report />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/gift" element={<Gift />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
