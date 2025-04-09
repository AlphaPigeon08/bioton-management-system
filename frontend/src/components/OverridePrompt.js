import React from "react";
import { Modal, Button, Table } from "react-bootstrap";


const OverridePrompt = ({ show, onCancel, onProceed, expiredBatches = [], reservedBatches = [] }) => {
  return (
    <Modal show={show} onHide={onCancel} backdrop="static" centered>
      <Modal.Header closeButton>
        <Modal.Title>⚠️ FIFO Override Detected</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Some batches are either expired or reserved. You can skip expired ones and proceed using reserved batches.</p>

        {expiredBatches.length > 0 && (
          <>
            <h6>❌ Expired Batches (Will be skipped):</h6>
            <Table striped bordered size="sm">
              <thead>
                <tr><th>Batch No</th><th>Expiry Date</th><th>Qty</th></tr>
              </thead>
              <tbody>
                {expiredBatches.map((b, idx) => (
                  <tr key={idx}>
                    <td>{b.batch_no}</td>
                    <td>{new Date(b.expiry_date).toLocaleDateString()}</td>
                    <td>{b.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}

        {reservedBatches.length > 0 && (
          <>
            <h6>⛔ Reserved Batches (Will be used if you proceed):</h6>
            <Table striped bordered size="sm">
              <thead>
                <tr><th>Batch No</th><th>Status</th><th>Qty</th></tr>
              </thead>
              <tbody>
                {reservedBatches.map((b, idx) => (
                  <tr key={idx}>
                    <td>{b.batch_no}</td>
                    <td>{b.status}</td>
                    <td>{b.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>❌ Cancel</Button>
        <Button variant="primary" onClick={onProceed}>✅ Proceed with Reserved</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default OverridePrompt;
