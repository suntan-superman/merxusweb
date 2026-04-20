import { labelAnalyticsValue } from './analyticsWorkspace.js';

export function buildTenantFeedbackViewModel(feedback = {}) {
  return {
    trendDaily: feedback.trends?.daily || [],
    trendDays: feedback.trends?.days || 7,
    funnelCards: [
      {
        title: 'Response Rate',
        value: `${feedback.funnel?.responseRate || 0}%`,
        helper: `Avg private rating ${feedback.funnel?.averageRating ?? '—'}`,
      },
      {
        title: 'Low Rating Rate',
        value: `${feedback.funnel?.lowRatingRate || 0}%`,
        helper: `${feedback.recovery?.open || 0} open recoveries`,
      },
      {
        title: 'Invite Send Rate',
        value: `${feedback.funnel?.reviewInviteSendRate || 0}%`,
        helper: 'Positive responses turned into invite sends',
      },
      {
        title: 'Invite Conversion',
        value: `${feedback.funnel?.reviewInviteConversionRate || 0}%`,
        helper: `${feedback.reviews?.total || 0} public reviews captured`,
      },
    ],
    reputationRows: (feedback.reviews?.byPlatform || []).map((item) => ({
      key: item.platform,
      label: labelAnalyticsValue(item.platform),
      value: item.count,
    })),
    sentimentRows: (feedback.reviews?.sentimentBreakdown || []).map((item) => ({
      key: item.sentiment,
      label: `Sentiment: ${labelAnalyticsValue(item.sentiment)}`,
      value: item.count,
    })),
    replyStateRows: (feedback.reviews?.responseBreakdown || []).map((item) => ({
      key: item.replyState,
      label: `Reply: ${labelAnalyticsValue(item.replyState)}`,
      value: item.count,
    })),
    replyWorkflowCards: [
      {
        title: 'Approval Coverage',
        value: `${feedback.replyWorkflow?.approvalCoverageRate || 0}%`,
        helper: `${feedback.replyWorkflow?.approved || 0} approved • ${feedback.replyWorkflow?.posted || 0} posted`,
      },
      {
        title: 'Posting Success',
        value: `${feedback.replyWorkflow?.postingSuccessRate || 0}%`,
        helper: `${feedback.replyWorkflow?.failed || 0} failed attempts`,
      },
      {
        title: 'Awaiting Post',
        value: feedback.replyWorkflow?.approved || 0,
        helper: `${feedback.replyWorkflow?.draft || 0} drafts pending approval`,
      },
      {
        title: 'Approval To Post',
        value:
          feedback.replyWorkflow?.averageApprovalToPostHours != null
            ? `${feedback.replyWorkflow.averageApprovalToPostHours}h`
            : '—',
        helper: `${feedback.replyWorkflow?.approvedToPostedRate || 0}% approved replies posted`,
      },
    ],
    sourceGroups: {
      requests: (feedback.sources?.requestBreakdown || []).map((item) => ({
        key: `request-${item.sourceType}`,
        label: labelAnalyticsValue(item.sourceType),
        value: item.count,
      })),
      lowRatings: (feedback.sources?.lowRatingBreakdown || []).map((item) => ({
        key: `low-rating-${item.sourceType}`,
        label: labelAnalyticsValue(item.sourceType),
        value: item.count,
      })),
    },
  };
}
