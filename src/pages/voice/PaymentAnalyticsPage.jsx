// web/src/pages/voice/PaymentAnalyticsPage.jsx
// Phase 3: Admin Payment Analytics Dashboard
// Shows payment stats, caller profiles, and policy management

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Form, Message, Segment, Tab, Table, Statistic, Grid, Modal, Icon } from 'semantic-ui-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';

export default function PaymentAnalyticsPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State
  const [stats, setStats] = useState(null);
  const [callers, setCallers] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [selectedDays, setSelectedDays] = useState(30);
  
  // Modal state
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({});
  const [selectedCaller, setSelectedCaller] = useState(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, [tenantId, selectedDays]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, callersRes, attemptsRes, policyRes] = await Promise.all([
        axios.get(`/voice/analytics/payment-stats/${tenantId}?days=${selectedDays}`),
        axios.get(`/voice/analytics/callers/${tenantId}?limit=50`),
        axios.get(`/voice/analytics/payment-attempts/${tenantId}?limit=30`),
        axios.get(`/voice/analytics/payment-policy/${tenantId}`),
      ]);

      setStats(statsRes.data);
      setCallers(callersRes.data.callers || []);
      setAttempts(attemptsRes.data.attempts || []);
      setPolicy(policyRes.data.policy);
      setPolicyForm(policyRes.data.policy || {});
    } catch (err) {
      console.error('Error fetching payment analytics:', err);
      setError(err.response?.data?.error || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePolicy = async () => {
    try {
      const response = await axios.put(
        `/voice/analytics/payment-policy/${tenantId}`,
        policyForm
      );
      setPolicy(response.data.policy);
      setPolicyModalOpen(false);
      alert('Payment policy updated successfully!');
      fetchAllData();
    } catch (err) {
      alert('Error updating policy: ' + err.response?.data?.error);
    }
  };

  const handleBlockCaller = async (callerId) => {
    try {
      await axios.post(
        `/voice/analytics/caller/block/${tenantId}/${callerId}`
      );
      alert('Caller blocked successfully!');
      fetchAllData();
      setBlockModalOpen(false);
    } catch (err) {
      alert('Error blocking caller: ' + err.response?.data?.error);
    }
  };

  const handleUnblockCaller = async (callerId) => {
    try {
      await axios.post(
        `/voice/analytics/caller/unblock/${tenantId}/${callerId}`
      );
      alert('Caller unblocked successfully!');
      fetchAllData();
    } catch (err) {
      alert('Error unblocking caller: ' + err.response?.data?.error);
    }
  };

  if (loading) {
    return (
      <Segment loading className="full-height">
        <p>Loading payment analytics...</p>
      </Segment>
    );
  }

  if (error) {
    return (
      <Message negative>
        <Message.Header>Error</Message.Header>
        <p>{error}</p>
      </Message>
    );
  }

  // Calculate data for charts
  const chartData = [
    { name: 'Successful', value: stats?.successfulAttempts || 0, color: '#52c41a' },
    { name: 'Failed', value: stats?.failedAttempts || 0, color: '#ff4d4f' },
  ];

  const panes = [
    {
      menuItem: '📊 Overview',
      render: () => (
        <Tab.Pane>
          <div style={{ marginTop: '20px' }}>
            <Grid columns={4} divided>
              <Grid.Row>
                <Grid.Column>
                  <Statistic>
                    <Statistic.Value>{stats?.totalAttempts}</Statistic.Value>
                    <Statistic.Label>Total Attempts</Statistic.Label>
                  </Statistic>
                </Grid.Column>
                <Grid.Column>
                  <Statistic color="green">
                    <Statistic.Value>{stats?.successfulAttempts}</Statistic.Value>
                    <Statistic.Label>Successful</Statistic.Label>
                  </Statistic>
                </Grid.Column>
                <Grid.Column>
                  <Statistic color="red">
                    <Statistic.Value>{stats?.failedAttempts}</Statistic.Value>
                    <Statistic.Label>Failed</Statistic.Label>
                  </Statistic>
                </Grid.Column>
                <Grid.Column>
                  <Statistic color="blue">
                    <Statistic.Value>${stats?.totalRevenue}</Statistic.Value>
                    <Statistic.Label>Total Revenue</Statistic.Label>
                  </Statistic>
                </Grid.Column>
              </Grid.Row>
            </Grid>

            <div style={{ marginTop: '30px' }}>
              <h3>Success vs Failure</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ marginTop: '30px' }}>
              <h3>Filter by Days:</h3>
              <Button.Group>
                <Button 
                  onClick={() => setSelectedDays(7)}
                  active={selectedDays === 7}
                >
                  7 Days
                </Button>
                <Button 
                  onClick={() => setSelectedDays(30)}
                  active={selectedDays === 30}
                >
                  30 Days
                </Button>
                <Button 
                  onClick={() => setSelectedDays(90)}
                  active={selectedDays === 90}
                >
                  90 Days
                </Button>
              </Button.Group>
            </div>
          </div>
        </Tab.Pane>
      ),
    },
    {
      menuItem: '👥 Callers',
      render: () => (
        <Tab.Pane>
          <div style={{ marginTop: '20px' }}>
            <h3>Caller Profiles ({callers.length})</h3>
            <Table celled selectable>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Phone</Table.HeaderCell>
                  <Table.HeaderCell>Name</Table.HeaderCell>
                  <Table.HeaderCell>Trust Score</Table.HeaderCell>
                  <Table.HeaderCell>Payments</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Actions</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {callers.map((caller) => (
                  <Table.Row key={caller.id}>
                    <Table.Cell>{caller.phone}</Table.Cell>
                    <Table.Cell>{caller.nameLastUsed || '-'}</Table.Cell>
                    <Table.Cell>
                      <div style={{
                        color: caller.trustScore >= 70 ? 'green' : caller.trustScore >= 50 ? 'orange' : 'red'
                      }}>
                        {caller.trustScore} / 100
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      ✅ {caller.successfulPayments} / ❌ {caller.failedPayments}
                    </Table.Cell>
                    <Table.Cell>
                      {caller.isBlocked ? (
                        <span style={{ color: 'red' }}>🚫 Blocked</span>
                      ) : (
                        <span style={{ color: 'green' }}>✓ Active</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {caller.isBlocked ? (
                        <Button 
                          size="small"
                          onClick={() => handleUnblockCaller(caller.id)}
                        >
                          Unblock
                        </Button>
                      ) : (
                        <Button 
                          size="small"
                          negative
                          onClick={() => {
                            setSelectedCaller(caller);
                            setBlockModalOpen(true);
                          }}
                        >
                          Block
                        </Button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </Tab.Pane>
      ),
    },
    {
      menuItem: '💳 Recent Transactions',
      render: () => (
        <Tab.Pane>
          <div style={{ marginTop: '20px' }}>
            <h3>Payment Attempts ({attempts.length})</h3>
            <Table celled compact>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Date</Table.HeaderCell>
                  <Table.HeaderCell>Caller</Table.HeaderCell>
                  <Table.HeaderCell>Amount</Table.HeaderCell>
                  <Table.HeaderCell>Card</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Type</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {attempts.slice(0, 20).map((attempt) => (
                  <Table.Row key={attempt.id}>
                    <Table.Cell>{new Date(attempt.createdAt).toLocaleDateString()}</Table.Cell>
                    <Table.Cell>{attempt.callerId}</Table.Cell>
                    <Table.Cell>${attempt.amount.toFixed(2)}</Table.Cell>
                    <Table.Cell>
                      {attempt.cardBrand} {attempt.cardLast4 ? `•••• ${attempt.cardLast4}` : '-'}
                    </Table.Cell>
                    <Table.Cell>
                      {attempt.status === 'success' ? (
                        <span style={{ color: 'green' }}>✅ Success</span>
                      ) : (
                        <span style={{ color: 'red' }}>❌ Failed</span>
                      )}
                    </Table.Cell>
                    <Table.Cell>{attempt.intent}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        </Tab.Pane>
      ),
    },
    {
      menuItem: '⚙️ Settings',
      render: () => (
        <Tab.Pane>
          <div style={{ marginTop: '20px' }}>
            <h3>Payment Policy</h3>
            <Card fluid>
              <Card.Content>
                <Segment>
                  <p><strong>System Status:</strong> {policy?.enabled ? '✅ Enabled' : '❌ Disabled'}</p>
                  <p><strong>Deposit Amount:</strong> ${policy?.depositAmount?.toFixed(2)}</p>
                  <p><strong>Trust Score Threshold:</strong> {policy?.trustScoreThreshold}</p>
                  <p><strong>Blacklist Threshold:</strong> {policy?.blacklistThreshold}</p>
                </Segment>

                <Modal
                  open={policyModalOpen}
                  onClose={() => setPolicyModalOpen(false)}
                  size="small"
                >
                  <Modal.Header>Edit Payment Policy</Modal.Header>
                  <Modal.Content>
                    <Form>
                      <Form.Field>
                        <label>Enable Payment System</label>
                        <input
                          type="checkbox"
                          checked={policyForm.enabled || false}
                          onChange={(e) => setPolicyForm({
                            ...policyForm,
                            enabled: e.target.checked
                          })}
                        />
                      </Form.Field>

                      <Form.Field>
                        <label>Require Deposit for Delivery Orders</label>
                        <input
                          type="checkbox"
                          checked={policyForm.requireDepositForDelivery || false}
                          onChange={(e) => setPolicyForm({
                            ...policyForm,
                            requireDepositForDelivery: e.target.checked
                          })}
                        />
                      </Form.Field>

                      <Form.Field>
                        <label>Require Deposit for New Callers</label>
                        <input
                          type="checkbox"
                          checked={policyForm.requireDepositForNewCaller || false}
                          onChange={(e) => setPolicyForm({
                            ...policyForm,
                            requireDepositForNewCaller: e.target.checked
                          })}
                        />
                      </Form.Field>

                      <Form.Field>
                        <label>Deposit Amount ($)</label>
                        <input
                          type="number"
                          value={policyForm.depositAmount || 5}
                          onChange={(e) => setPolicyForm({
                            ...policyForm,
                            depositAmount: parseFloat(e.target.value)
                          })}
                          step="0.01"
                        />
                      </Form.Field>

                      <Form.Field>
                        <label>Trust Score Threshold</label>
                        <input
                          type="number"
                          value={policyForm.trustScoreThreshold || 70}
                          onChange={(e) => setPolicyForm({
                            ...policyForm,
                            trustScoreThreshold: parseInt(e.target.value)
                          })}
                          min="0"
                          max="100"
                        />
                      </Form.Field>
                    </Form>
                  </Modal.Content>
                  <Modal.Actions>
                    <Button onClick={() => setPolicyModalOpen(false)}>Cancel</Button>
                    <Button positive onClick={handleUpdatePolicy}>Save Changes</Button>
                  </Modal.Actions>
                </Modal>

                <Button primary onClick={() => setPolicyModalOpen(true)} style={{ marginTop: '20px' }}>
                  <Icon name="edit" /> Edit Policy
                </Button>
              </Card.Content>
            </Card>
          </div>
        </Tab.Pane>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h1>💳 Payment Analytics Dashboard</h1>
      <p>Restaurant ID: {tenantId}</p>

      <Tab panes={panes} />

      <Modal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        size="small"
      >
        <Modal.Header>Block Caller</Modal.Header>
        <Modal.Content>
          <p>Are you sure you want to block this caller?</p>
          {selectedCaller && (
            <p><strong>Phone:</strong> {selectedCaller.phone}</p>
          )}
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={() => setBlockModalOpen(false)}>Cancel</Button>
          <Button negative onClick={() => handleBlockCaller(selectedCaller?.id)}>
            Block Caller
          </Button>
        </Modal.Actions>
      </Modal>
    </div>
  );
}
