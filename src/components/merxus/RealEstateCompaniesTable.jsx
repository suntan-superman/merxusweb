import { formatPhoneDisplay } from '../../utils/phoneFormatter';

export default function RealEstateCompaniesTable({ companies = [], onSelect, selectedId }) {
  if (!companies || companies.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No real estate companies found.
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[1100px]">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Agent Name</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Brokerage</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Business Phone</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Merxus AI Number</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Listings</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Homes Sold</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Experience</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr
              key={company.id || company.agentId}
              onClick={() => onSelect(company)}
              className={`border-b border-gray-100 cursor-pointer transition-colors ${
                (selectedId === company.id || selectedId === company.agentId)
                  ? 'bg-primary-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                <div>{company.name || 'N/A'}</div>
                <div className="text-xs text-gray-500">{company.brandName || '—'}</div>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {company.brokerage || 'N/A'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {formatPhoneDisplay(company.phoneNumber || company.phonePrimary || company.phone) || 'N/A'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {formatPhoneDisplay(company.twilioPhoneNumber) || 'Not assigned'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  {company.activeListings || 0}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  {company.homesSold || 0}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {company.yearsExperience ? `${company.yearsExperience} yrs` : '—'}
              </td>
              <td className="px-6 py-4 text-sm">
                {company.disabled ? (
                  <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded">Disabled</span>
                ) : (
                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded">Active</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
