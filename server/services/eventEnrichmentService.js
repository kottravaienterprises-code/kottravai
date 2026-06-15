const enrichEventContext = async (eventPayload = {}) => {
  const source = eventPayload?.source || 'unknown';
  const category = eventPayload?.category || 'System';

  return {
    ...eventPayload,
    enriched: true,
    businessContext: {
      source,
      category,
      severity: category === 'Revenue' ? 'High' : 'Medium',
      recommendedAction: category === 'Revenue' ? 'Escalate to executive review' : 'Monitor and route'
    }
  };
};

module.exports = {
  enrichEventContext
};
