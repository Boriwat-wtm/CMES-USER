import React, { useState, useEffect } from "react";


function Status() {
  const [status, setStatus] = useState([]);

  useEffect(() => {
    // Fetch status from the server or local storage
    // This is just a mock example
    const mockStatus = [
      { time: "เช้า", order: 1 },
      { time: "บ่าย", order: 2 },
      { time: "เย็น", order: 3 },
    ];
    setStatus(mockStatus);
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>สถานะขึ้นจอ</h1>
      <ul>
        {status.map((item, index) => (
          <li key={index}>
            เวลา: {item.time}, ลำดับ: {item.order}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Status;