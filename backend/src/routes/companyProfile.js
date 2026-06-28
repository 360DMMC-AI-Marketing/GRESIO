const { Router } = require('express');
const router = Router();
const Company = require('../models/Company');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const company = await Company.findOne({ domain: req.user.domain });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ profile: {
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      description: company.description,
      departments: company.departments,
      typicalProjects: company.typicalProjects,
      techStack: company.techStack,
      tagline: company.tagline,
      website: company.website,
      country: company.country,
      timezone: company.timezone,
      profileCompleted: company.profileCompleted,
      foundedYear: company.foundedYear,
      companySize: company.companySize,
      mission: company.mission,
      vision: company.vision,
      coreValues: company.coreValues,
      linkedin: company.linkedin,
      twitter: company.twitter,
      github: company.github,
      brandColor: company.brandColor,
      logo: company.logo,
    }});
  } catch (err) { next(err); }
});

router.put('/', authorize('admin'), async (req, res, next) => {
  try {
    const { industry, description, departments, typicalProjects, techStack, tagline, website, country, timezone, foundedYear, companySize, mission, vision, coreValues, linkedin, twitter, github, brandColor } = req.body;
    const update = {};
    if (industry !== undefined) update.industry = industry;
    if (description !== undefined) update.description = description;
    if (departments !== undefined) update.departments = departments;
    if (typicalProjects !== undefined) update.typicalProjects = typicalProjects;
    if (techStack !== undefined) update.techStack = techStack;
    if (tagline !== undefined) update.tagline = tagline;
    if (website !== undefined) update.website = website;
    if (country !== undefined) update.country = country;
    if (timezone !== undefined) update.timezone = timezone;
    if (foundedYear !== undefined) update.foundedYear = foundedYear;
    if (companySize !== undefined) update.companySize = companySize;
    if (mission !== undefined) update.mission = mission;
    if (vision !== undefined) update.vision = vision;
    if (coreValues !== undefined) update.coreValues = coreValues;
    if (linkedin !== undefined) update.linkedin = linkedin;
    if (twitter !== undefined) update.twitter = twitter;
    if (github !== undefined) update.github = github;
    if (brandColor !== undefined) update.brandColor = brandColor;
    update.profileCompleted = true;
    const company = await Company.findOneAndUpdate({ domain: req.user.domain }, update, { new: true });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ profile: {
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      description: company.description,
      departments: company.departments,
      typicalProjects: company.typicalProjects,
      techStack: company.techStack,
      tagline: company.tagline,
      website: company.website,
      country: company.country,
      timezone: company.timezone,
      profileCompleted: company.profileCompleted,
      foundedYear: company.foundedYear,
      companySize: company.companySize,
      mission: company.mission,
      vision: company.vision,
      coreValues: company.coreValues,
      linkedin: company.linkedin,
      twitter: company.twitter,
      github: company.github,
      brandColor: company.brandColor,
      logo: company.logo,
    }});
  } catch (err) { next(err); }
});

module.exports = router;
