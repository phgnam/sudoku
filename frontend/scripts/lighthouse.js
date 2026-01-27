#!/usr/bin/env node

/**
 * Lighthouse Performance Audit Script
 * Runs Lighthouse audit on the production build
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || 'http://localhost:3000';

async function runLighthouse() {
  console.log(`🔍 Running Lighthouse audit on: ${url}\n`);

  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };

  try {
    const runnerResult = await lighthouse(url, options);

    // The gathered artifacts and report
    const reportHtml = runnerResult.report;
    const scores = runnerResult.lhr.categories;

    // Print scores
    console.log('📊 Lighthouse Scores:\n');
    console.log(`⚡ Performance:     ${Math.round(scores.performance.score * 100)}/100`);
    console.log(`♿ Accessibility:   ${Math.round(scores.accessibility.score * 100)}/100`);
    console.log(`✅ Best Practices:  ${Math.round(scores['best-practices'].score * 100)}/100`);
    console.log(`🔍 SEO:            ${Math.round(scores.seo.score * 100)}/100\n`);

    // Save report
    const reportPath = path.join(__dirname, '../lighthouse-report.html');
    fs.writeFileSync(reportPath, reportHtml);
    console.log(`📄 Full report saved to: ${reportPath}\n`);

    // Check if scores meet targets
    const targets = {
      performance: 90,
      accessibility: 95,
      'best-practices': 90,
      seo: 90,
    };

    let allPassed = true;
    for (const [category, target] of Object.entries(targets)) {
      const score = Math.round(scores[category].score * 100);
      if (score < target) {
        console.log(`❌ ${category}: ${score} (target: ${target})`);
        allPassed = false;
      } else {
        console.log(`✅ ${category}: ${score} (target: ${target})`);
      }
    }

    await chrome.kill();

    if (!allPassed) {
      console.log('\n⚠️  Some scores below target. Review the report for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 All scores meet targets!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Lighthouse audit failed:', error);
    await chrome.kill();
    process.exit(1);
  }
}

runLighthouse();
