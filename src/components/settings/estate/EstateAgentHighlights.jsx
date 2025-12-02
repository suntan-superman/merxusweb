import { useState } from 'react';

export default function EstateAgentHighlights({ settings, onSave, saving }) {
  const [form, setForm] = useState({
    yearsExperience: settings.yearsExperience || '',
    homesSold: settings.homesSold || '',
    specializations: Array.isArray(settings.specializations) 
      ? settings.specializations.join(', ') 
      : (settings.specializations || ''),
    awards: Array.isArray(settings.awards) 
      ? settings.awards.join('\n') 
      : (settings.awards || ''),
    certifications: Array.isArray(settings.certifications) 
      ? settings.certifications.join(', ') 
      : (settings.certifications || ''),
    responseTime: settings.responseTime || '',
    uniqueValue: settings.uniqueValue || settings.agentHighlights || '',
    testimonials: Array.isArray(settings.testimonials) 
      ? settings.testimonials.join('\n\n---\n\n') 
      : (settings.testimonials || ''),
    // Market Statistics
    avgDaysOnMarket: settings.avgDaysOnMarket || '',
    avgSaleToListRatio: settings.avgSaleToListRatio || '',
    activeListings: settings.activeListings || '',
    marketShare: settings.marketShare || '',
    // Service Guarantees
    serviceGuarantees: Array.isArray(settings.serviceGuarantees) 
      ? settings.serviceGuarantees.join('\n') 
      : (settings.serviceGuarantees || ''),
    // Technology/Process
    technologyFeatures: Array.isArray(settings.technologyFeatures) 
      ? settings.technologyFeatures.join('\n') 
      : (settings.technologyFeatures || ''),
    // Community Involvement
    communityInvolvement: settings.communityInvolvement || '',
    // Team Information
    teamSize: settings.teamSize || '',
    teamDescription: settings.teamDescription || '',
    // Market Expertise
    neighborhoodsServed: Array.isArray(settings.neighborhoodsServed) 
      ? settings.neighborhoodsServed.join(', ') 
      : (settings.neighborhoodsServed || ''),
    priceRangeExpertise: settings.priceRangeExpertise || '',
    propertyTypeExpertise: Array.isArray(settings.propertyTypeExpertise) 
      ? settings.propertyTypeExpertise.join(', ') 
      : (settings.propertyTypeExpertise || ''),
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    
    // Convert arrays
    const specializationsArray = form.specializations
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    
    const awardsArray = form.awards
      .split(/\n/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);
    
    const certificationsArray = form.certifications
      .split(/[,\n]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    
    const testimonialsArray = form.testimonials
      .split(/\n\n---\n\n/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    
    const serviceGuaranteesArray = form.serviceGuarantees
      .split(/\n/)
      .map((g) => g.trim())
      .filter((g) => g.length > 0);
    
    const technologyFeaturesArray = form.technologyFeatures
      .split(/\n/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    
    const neighborhoodsServedArray = form.neighborhoodsServed
      .split(/[,\n]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    
    const propertyTypeExpertiseArray = form.propertyTypeExpertise
      .split(/[,\n]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    onSave({
      yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience, 10) : null,
      homesSold: form.homesSold ? parseInt(form.homesSold, 10) : null,
      specializations: specializationsArray,
      awards: awardsArray,
      certifications: certificationsArray,
      responseTime: form.responseTime || null,
      uniqueValue: form.uniqueValue,
      agentHighlights: form.uniqueValue, // Alias for backward compatibility
      testimonials: testimonialsArray,
      // Market Statistics
      avgDaysOnMarket: form.avgDaysOnMarket ? parseInt(form.avgDaysOnMarket, 10) : null,
      avgSaleToListRatio: form.avgSaleToListRatio || null,
      activeListings: form.activeListings ? parseInt(form.activeListings, 10) : null,
      marketShare: form.marketShare || null,
      // Service Guarantees
      serviceGuarantees: serviceGuaranteesArray,
      // Technology/Process
      technologyFeatures: technologyFeaturesArray,
      // Community Involvement
      communityInvolvement: form.communityInvolvement || null,
      // Team Information
      teamSize: form.teamSize ? parseInt(form.teamSize, 10) : null,
      teamDescription: form.teamDescription || null,
      // Market Expertise
      neighborhoodsServed: neighborhoodsServedArray,
      priceRangeExpertise: form.priceRangeExpertise || null,
      propertyTypeExpertise: propertyTypeExpertiseArray,
    });
  }

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Choose Me / Agent Highlights</h3>
      <p className="text-sm text-gray-600 mb-4">
        Add your unique selling points, accolades, and reasons why clients should choose you. 
        The AI assistant will use this information when callers ask "Why should I use you?" or similar questions.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="yearsExperience" className="block text-sm font-medium text-gray-700 mb-2">
              Years of Experience
            </label>
            <input
              id="yearsExperience"
              name="yearsExperience"
              type="number"
              min="0"
              value={form.yearsExperience}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., 15"
            />
          </div>
          <div>
            <label htmlFor="homesSold" className="block text-sm font-medium text-gray-700 mb-2">
              Homes Sold (Total)
            </label>
            <input
              id="homesSold"
              name="homesSold"
              type="number"
              min="0"
              value={form.homesSold}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., 250"
            />
          </div>
        </div>

        {/* Specializations */}
        <div>
          <label htmlFor="specializations" className="block text-sm font-medium text-gray-700 mb-2">
            Specializations
          </label>
          <input
            id="specializations"
            name="specializations"
            type="text"
            value={form.specializations}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., First-time buyers, Luxury homes, Investment properties, Relocations"
          />
          <p className="text-xs text-gray-500 mt-1">
            Comma-separated list of your areas of expertise
          </p>
        </div>

        {/* Certifications */}
        <div>
          <label htmlFor="certifications" className="block text-sm font-medium text-gray-700 mb-2">
            Professional Certifications
          </label>
          <input
            id="certifications"
            name="certifications"
            type="text"
            value={form.certifications}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., CRS, ABR, GRI, SFR"
          />
          <p className="text-xs text-gray-500 mt-1">
            Comma-separated list of certifications and designations
          </p>
        </div>

        {/* Awards & Recognition */}
        <div>
          <label htmlFor="awards" className="block text-sm font-medium text-gray-700 mb-2">
            Awards & Recognition
          </label>
          <textarea
            id="awards"
            name="awards"
            rows="4"
            value={form.awards}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter each award on a new line:&#10;Top Producer 2023&#10;Agent of the Year 2022&#10;Million Dollar Club"
          />
          <p className="text-xs text-gray-500 mt-1">
            List your awards, one per line
          </p>
        </div>

        {/* Response Time */}
        <div>
          <label htmlFor="responseTime" className="block text-sm font-medium text-gray-700 mb-2">
            Response Time Guarantee
          </label>
          <input
            id="responseTime"
            name="responseTime"
            type="text"
            value={form.responseTime}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., Same-day response, 24/7 availability, Within 2 hours"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your commitment to response time (optional)
          </p>
        </div>

        {/* Unique Value Proposition */}
        <div>
          <label htmlFor="uniqueValue" className="block text-sm font-medium text-gray-700 mb-2">
            Why Choose Me / Unique Value Proposition *
          </label>
          <textarea
            id="uniqueValue"
            name="uniqueValue"
            rows="6"
            required
            value={form.uniqueValue}
            onChange={handleChange}
            className="input-field"
            placeholder="Write a compelling summary of why clients should choose you. This will be used when callers ask 'Why should I use you?' or 'What makes you different?'&#10;&#10;Examples:&#10;- '15 years of experience helping first-time buyers navigate the market'&#10;- 'Top 1% of agents in Bakersfield with over 250 homes sold'&#10;- 'Specialized in luxury properties and investment real estate'&#10;- 'Known for exceptional negotiation skills and getting deals closed'&#10;- 'Bilingual service in English and Spanish'"
          />
          <p className="text-xs text-gray-500 mt-1">
            This is the main selling point the AI will use. Be specific and compelling.
          </p>
        </div>

        {/* Testimonials */}
        <div>
          <label htmlFor="testimonials" className="block text-sm font-medium text-gray-700 mb-2">
            Client Testimonials (Optional)
          </label>
          <textarea
            id="testimonials"
            name="testimonials"
            rows="6"
            value={form.testimonials}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter testimonials separated by '---' on a blank line:&#10;&#10;'Adam helped us find our dream home in just 2 weeks!' - Sarah M.&#10;&#10;---&#10;&#10;'Best real estate experience we've ever had. Highly recommend!' - John D."
          />
          <p className="text-xs text-gray-500 mt-1">
            Separate multiple testimonials with '---' on a blank line. The AI may reference these when appropriate.
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Market Statistics</h4>
        </div>

        {/* Market Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="avgDaysOnMarket" className="block text-sm font-medium text-gray-700 mb-2">
              Average Days on Market
            </label>
            <input
              id="avgDaysOnMarket"
              name="avgDaysOnMarket"
              type="number"
              min="0"
              value={form.avgDaysOnMarket}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., 28"
            />
          </div>
          <div>
            <label htmlFor="avgSaleToListRatio" className="block text-sm font-medium text-gray-700 mb-2">
              Average Sale-to-List Price Ratio
            </label>
            <input
              id="avgSaleToListRatio"
              name="avgSaleToListRatio"
              type="text"
              value={form.avgSaleToListRatio}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., 98.5%"
            />
          </div>
          <div>
            <label htmlFor="activeListings" className="block text-sm font-medium text-gray-700 mb-2">
              Active Listings
            </label>
            <input
              id="activeListings"
              name="activeListings"
              type="number"
              min="0"
              value={form.activeListings}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., 15"
            />
          </div>
          <div>
            <label htmlFor="marketShare" className="block text-sm font-medium text-gray-700 mb-2">
              Market Share
            </label>
            <input
              id="marketShare"
              name="marketShare"
              type="text"
              value={form.marketShare}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., Top 5% in Bakersfield"
            />
          </div>
        </div>

        {/* Service Guarantees */}
        <div>
          <label htmlFor="serviceGuarantees" className="block text-sm font-medium text-gray-700 mb-2">
            Service Guarantees
          </label>
          <textarea
            id="serviceGuarantees"
            name="serviceGuarantees"
            rows="4"
            value={form.serviceGuarantees}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter each guarantee on a new line:&#10;100% satisfaction guarantee&#10;Free home staging consultation&#10;No obligation consultation&#10;Free market analysis"
          />
          <p className="text-xs text-gray-500 mt-1">
            List your service guarantees, one per line
          </p>
        </div>

        {/* Technology/Process */}
        <div>
          <label htmlFor="technologyFeatures" className="block text-sm font-medium text-gray-700 mb-2">
            Technology & Process Features
          </label>
          <textarea
            id="technologyFeatures"
            name="technologyFeatures"
            rows="4"
            value={form.technologyFeatures}
            onChange={handleChange}
            className="input-field"
            placeholder="Enter each feature on a new line:&#10;Virtual tour specialist&#10;Drone photography included&#10;Digital marketing expert&#10;3D home staging visualization"
          />
          <p className="text-xs text-gray-500 mt-1">
            List your technology and process features, one per line
          </p>
        </div>

        {/* Community Involvement */}
        <div>
          <label htmlFor="communityInvolvement" className="block text-sm font-medium text-gray-700 mb-2">
            Community Involvement
          </label>
          <textarea
            id="communityInvolvement"
            name="communityInvolvement"
            rows="3"
            value={form.communityInvolvement}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., Active member of Bakersfield Chamber of Commerce, Volunteer with Habitat for Humanity, Sponsor of local youth sports teams"
          />
          <p className="text-xs text-gray-500 mt-1">
            Describe your community involvement and local connections
          </p>
        </div>

        {/* Team Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="teamSize" className="block text-sm font-medium text-gray-700 mb-2">
              Team Size
            </label>
            <input
              id="teamSize"
              name="teamSize"
              type="number"
              min="0"
              value={form.teamSize}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., 5"
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of team members (including yourself)
            </p>
          </div>
          <div>
            <label htmlFor="teamDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Team Description
            </label>
            <input
              id="teamDescription"
              name="teamDescription"
              type="text"
              value={form.teamDescription}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., Full-service team with dedicated showing coordinator"
            />
          </div>
        </div>

        {/* Market Expertise */}
        <div>
          <label htmlFor="neighborhoodsServed" className="block text-sm font-medium text-gray-700 mb-2">
            Neighborhoods Served
          </label>
          <input
            id="neighborhoodsServed"
            name="neighborhoodsServed"
            type="text"
            value={form.neighborhoodsServed}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., Northwest Bakersfield, Riverlakes, Westlake, Polo Grounds"
          />
          <p className="text-xs text-gray-500 mt-1">
            Comma-separated list of neighborhoods or areas you specialize in
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="priceRangeExpertise" className="block text-sm font-medium text-gray-700 mb-2">
              Price Range Expertise
            </label>
            <input
              id="priceRangeExpertise"
              name="priceRangeExpertise"
              type="text"
              value={form.priceRangeExpertise}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., $200K - $1M+, Luxury properties $500K+"
            />
          </div>
          <div>
            <label htmlFor="propertyTypeExpertise" className="block text-sm font-medium text-gray-700 mb-2">
              Property Type Expertise
            </label>
            <input
              id="propertyTypeExpertise"
              name="propertyTypeExpertise"
              type="text"
              value={form.propertyTypeExpertise}
              onChange={handleChange}
              className="input-field"
              placeholder="e.g., Single-family homes, Condos, Investment properties, Luxury estates"
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated list of property types you specialize in
            </p>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Highlights'}
        </button>
      </form>
    </section>
  );
}

