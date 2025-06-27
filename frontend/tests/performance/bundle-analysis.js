/**
 * Bundle Size Analysis
 * Lion Football Academy Frontend Testing Suite
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Bundle size thresholds (in bytes)
const SIZE_THRESHOLDS = {
  main: 512 * 1024, // 512KB for main bundle
  chunk: 256 * 1024, // 256KB for individual chunks
  total: 2 * 1024 * 1024, // 2MB total
  css: 100 * 1024, // 100KB for CSS
};

// Performance budgets
const PERFORMANCE_BUDGETS = {
  javascript: 1.5 * 1024 * 1024, // 1.5MB total JS
  css: 200 * 1024, // 200KB total CSS
  images: 1 * 1024 * 1024, // 1MB total images
  fonts: 300 * 1024, // 300KB total fonts
  other: 500 * 1024, // 500KB other assets
};

class BundleAnalyzer {
  constructor(buildPath = './build') {
    this.buildPath = path.resolve(buildPath);
    this.results = {
      timestamp: new Date().toISOString(),
      bundles: [],
      assets: [],
      summary: {},
      recommendations: [],
      passed: false,
    };
  }

  async analyze() {
    console.log('📦 Starting Bundle Analysis...');
    
    try {
      // Build the application first
      await this.buildApplication();
      
      // Analyze the build output
      await this.analyzeBuildOutput();
      
      // Generate webpack bundle analyzer report
      await this.generateWebpackAnalysis();
      
      // Analyze asset types and sizes
      await this.analyzeAssetTypes();
      
      // Check performance budgets
      await this.checkPerformanceBudgets();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Create reports
      await this.generateReports();
      
      console.log('✅ Bundle analysis completed!');
      return this.results;
      
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error);
      throw error;
    }
  }

  async buildApplication() {
    console.log('🏗️  Building application...');
    
    try {
      // Remove previous build
      if (fs.existsSync(this.buildPath)) {
        execSync(`rm -rf ${this.buildPath}`, { stdio: 'pipe' });
      }
      
      // Build the application
      const buildCommand = 'npm run build';
      const buildOutput = execSync(buildCommand, { 
        stdio: 'pipe',
        encoding: 'utf8',
        cwd: path.dirname(this.buildPath),
      });
      
      console.log('✅ Application built successfully');
      
      // Parse build output for webpack stats
      this.parseBuildOutput(buildOutput);
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  parseBuildOutput(output) {
    // Extract file sizes from build output
    const lines = output.split('\n');
    const filePattern = /(\d+(?:\.\d+)?)\s*(B|kB|MB)\s+(.+\.(js|css|html|json|txt))/;
    
    lines.forEach(line => {
      const match = line.match(filePattern);
      if (match) {
        const [, sizeValue, unit, filename] = match;
        const sizeInBytes = this.convertToBytes(parseFloat(sizeValue), unit);
        
        this.results.bundles.push({
          filename: path.basename(filename),
          size: sizeInBytes,
          sizeFormatted: `${sizeValue} ${unit}`,
          type: this.getFileType(filename),
        });
      }
    });
  }

  async analyzeBuildOutput() {
    console.log('🔍 Analyzing build output...');
    
    if (!fs.existsSync(this.buildPath)) {
      throw new Error(`Build directory not found: ${this.buildPath}`);
    }

    // Analyze static directory
    const staticPath = path.join(this.buildPath, 'static');
    if (fs.existsSync(staticPath)) {
      await this.analyzeDirectory(staticPath, 'static');
    }

    // Analyze root build files
    await this.analyzeDirectory(this.buildPath, 'root');
  }

  async analyzeDirectory(dirPath, category) {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      
      if (file.isDirectory()) {
        await this.analyzeDirectory(filePath, category);
      } else {
        const stats = fs.statSync(filePath);
        const relativePath = path.relative(this.buildPath, filePath);
        
        const asset = {
          filename: file.name,
          path: relativePath,
          size: stats.size,
          sizeFormatted: this.formatBytes(stats.size),
          type: this.getFileType(file.name),
          category,
          gzipSize: await this.getGzipSize(filePath),
        };

        this.results.assets.push(asset);
      }
    }
  }

  async getGzipSize(filePath) {
    try {
      const gzipCommand = `gzip -c "${filePath}" | wc -c`;
      const gzipSize = parseInt(execSync(gzipCommand, { encoding: 'utf8' }).trim());
      return gzipSize;
    } catch (error) {
      return null;
    }
  }

  async generateWebpackAnalysis() {
    console.log('📊 Generating webpack bundle analysis...');
    
    try {
      // Run webpack-bundle-analyzer
      const analyzeCommand = 'npx webpack-bundle-analyzer build/static/js/*.js --mode static --report build/bundle-report.html --no-open';
      execSync(analyzeCommand, { stdio: 'pipe' });
      
      console.log('✅ Webpack analysis generated: build/bundle-report.html');
    } catch (error) {
      console.warn('⚠️  Webpack bundle analyzer failed:', error.message);
    }
  }

  analyzeAssetTypes() {
    console.log('📋 Analyzing asset types...');
    
    const assetsByType = {};
    
    this.results.assets.forEach(asset => {
      if (!assetsByType[asset.type]) {
        assetsByType[asset.type] = {
          count: 0,
          totalSize: 0,
          totalGzipSize: 0,
          files: [],
        };
      }
      
      assetsByType[asset.type].count++;
      assetsByType[asset.type].totalSize += asset.size;
      assetsByType[asset.type].totalGzipSize += asset.gzipSize || 0;
      assetsByType[asset.type].files.push(asset);
    });

    // Sort files by size within each type
    Object.values(assetsByType).forEach(typeData => {
      typeData.files.sort((a, b) => b.size - a.size);
    });

    this.results.assetsByType = assetsByType;
  }

  checkPerformanceBudgets() {
    console.log('🎯 Checking performance budgets...');
    
    const budgetResults = {};
    
    Object.entries(PERFORMANCE_BUDGETS).forEach(([type, budget]) => {
      const typeData = this.results.assetsByType[type];
      const actualSize = typeData ? typeData.totalSize : 0;
      
      budgetResults[type] = {
        budget,
        actual: actualSize,
        passed: actualSize <= budget,
        usage: Math.round((actualSize / budget) * 100),
        formatted: {
          budget: this.formatBytes(budget),
          actual: this.formatBytes(actualSize),
        },
      };
    });

    this.results.budgetResults = budgetResults;
    
    // Check individual file thresholds
    const oversizedFiles = this.results.assets.filter(asset => {
      if (asset.type === 'javascript') {
        return asset.size > SIZE_THRESHOLDS.chunk;
      }
      if (asset.type === 'css') {
        return asset.size > SIZE_THRESHOLDS.css;
      }
      return false;
    });

    this.results.oversizedFiles = oversizedFiles;
  }

  generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    const recommendations = [];

    // Check budget violations
    Object.entries(this.results.budgetResults).forEach(([type, result]) => {
      if (!result.passed) {
        recommendations.push({
          type: 'budget_violation',
          severity: 'high',
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Budget Exceeded`,
          description: `${type} assets are ${result.usage}% of budget (${result.formatted.actual} / ${result.formatted.budget})`,
          suggestions: this.getSuggestionsForType(type),
        });
      }
    });

    // Check oversized files
    this.results.oversizedFiles.forEach(file => {
      recommendations.push({
        type: 'oversized_file',
        severity: 'medium',
        title: `Large ${file.type} file`,
        description: `${file.filename} is ${file.sizeFormatted}`,
        suggestions: this.getSuggestionsForFile(file),
      });
    });

    // Check for optimization opportunities
    this.addOptimizationRecommendations(recommendations);

    this.results.recommendations = recommendations;
  }

  getSuggestionsForType(type) {
    const suggestions = {
      javascript: [
        'Implement code splitting to break large bundles into smaller chunks',
        'Use dynamic imports for route-based code splitting',
        'Remove unused dependencies and dead code',
        'Consider using a smaller alternative library',
        'Enable tree shaking in webpack configuration',
      ],
      css: [
        'Remove unused CSS rules',
        'Use CSS modules or styled-components for better tree shaking',
        'Consider critical CSS extraction',
        'Minimize CSS files',
      ],
      images: [
        'Optimize images using modern formats (WebP, AVIF)',
        'Implement responsive images with different sizes',
        'Use lazy loading for images',
        'Consider image CDN for better compression',
      ],
      fonts: [
        'Use font-display: swap for better loading performance',
        'Subset fonts to include only used characters',
        'Consider system fonts as fallbacks',
        'Preload critical fonts',
      ],
    };

    return suggestions[type] || ['Review and optimize assets of this type'];
  }

  getSuggestionsForFile(file) {
    if (file.type === 'javascript') {
      return [
        'Split this bundle into smaller chunks',
        'Check for duplicate dependencies',
        'Use dynamic imports for lazy loading',
        'Review third-party library usage',
      ];
    }
    
    if (file.type === 'css') {
      return [
        'Remove unused CSS rules',
        'Split CSS by components or routes',
        'Use CSS minification',
      ];
    }

    return ['Optimize this file for better performance'];
  }

  addOptimizationRecommendations(recommendations) {
    // Check for common optimization opportunities
    
    // Many small files
    const smallFiles = this.results.assets.filter(asset => 
      asset.size < 10 * 1024 && asset.type === 'javascript'
    );
    
    if (smallFiles.length > 10) {
      recommendations.push({
        type: 'many_small_files',
        severity: 'medium',
        title: 'Many Small JavaScript Files',
        description: `Found ${smallFiles.length} small JavaScript files that could be bundled together`,
        suggestions: [
          'Configure webpack to bundle small files together',
          'Use webpack SplitChunksPlugin optimization',
          'Consider increasing the minimum chunk size',
        ],
      });
    }

    // Uncompressed assets
    const uncompressedLarge = this.results.assets.filter(asset => 
      asset.size > 50 * 1024 && !asset.gzipSize
    );
    
    if (uncompressedLarge.length > 0) {
      recommendations.push({
        type: 'compression_opportunity',
        severity: 'medium',
        title: 'Enable Compression',
        description: 'Enable gzip/brotli compression for better transfer sizes',
        suggestions: [
          'Configure server to enable gzip compression',
          'Consider brotli compression for modern browsers',
          'Use CompressionWebpackPlugin for pre-compression',
        ],
      });
    }
  }

  async generateReports() {
    console.log('📄 Generating reports...');
    
    // Create summary
    this.results.summary = {
      totalAssets: this.results.assets.length,
      totalSize: this.results.assets.reduce((sum, asset) => sum + asset.size, 0),
      totalGzipSize: this.results.assets.reduce((sum, asset) => sum + (asset.gzipSize || 0), 0),
      compressionRatio: 0,
      budgetsPassed: Object.values(this.results.budgetResults).filter(r => r.passed).length,
      totalBudgets: Object.keys(this.results.budgetResults).length,
      recommendations: this.results.recommendations.length,
      highSeverityIssues: this.results.recommendations.filter(r => r.severity === 'high').length,
    };

    if (this.results.summary.totalGzipSize > 0) {
      this.results.summary.compressionRatio = Math.round(
        (1 - this.results.summary.totalGzipSize / this.results.summary.totalSize) * 100
      );
    }

    this.results.passed = this.results.summary.budgetsPassed === this.results.summary.totalBudgets &&
                          this.results.summary.highSeverityIssues === 0;

    // Format sizes
    this.results.summary.totalSizeFormatted = this.formatBytes(this.results.summary.totalSize);
    this.results.summary.totalGzipSizeFormatted = this.formatBytes(this.results.summary.totalGzipSize);

    // Save JSON report
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const jsonPath = path.join(reportsDir, 'bundle-analysis.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.results, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport();
    const htmlPath = path.join(reportsDir, 'bundle-analysis.html');
    fs.writeFileSync(htmlPath, htmlReport);

    console.log(`📊 Bundle analysis reports generated:`);
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  HTML: ${htmlPath}`);
  }

  generateHTMLReport() {
    const assetsByTypeEntries = Object.entries(this.results.assetsByType || {});
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bundle Analysis Report - Lion Football Academy</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
        .metric { font-size: 1.5em; font-weight: bold; color: #007bff; }
        .budgets { margin-bottom: 40px; }
        .budget-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; margin: 10px 0; border-radius: 6px; }
        .budget-pass { background: #d4edda; color: #155724; }
        .budget-fail { background: #f8d7da; color: #721c24; }
        .progress-bar { width: 200px; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .assets-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .assets-table th, .assets-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .assets-table th { background: #007bff; color: white; }
        .file-size { font-family: monospace; }
        .recommendations { background: #fff3cd; padding: 20px; border-radius: 6px; border-left: 4px solid #ffc107; }
        .rec-item { margin: 15px 0; padding: 15px; background: white; border-radius: 4px; border-left: 3px solid #007bff; }
        .severity-high { border-left-color: #dc3545; }
        .severity-medium { border-left-color: #ffc107; }
        .severity-low { border-left-color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 Bundle Analysis Report</h1>
            <h2>Lion Football Academy</h2>
            <p>Generated: ${new Date(this.results.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Bundle Size</h3>
                <div class="metric">${this.results.summary.totalSizeFormatted}</div>
                <p>Compressed: ${this.results.summary.totalGzipSizeFormatted} (${this.results.summary.compressionRatio}% saved)</p>
            </div>
            <div class="summary-card">
                <h3>Total Assets</h3>
                <div class="metric">${this.results.summary.totalAssets}</div>
                <p>Files analyzed</p>
            </div>
            <div class="summary-card">
                <h3>Budget Status</h3>
                <div class="metric ${this.results.passed ? '' : 'text-danger'}">${this.results.summary.budgetsPassed}/${this.results.summary.totalBudgets}</div>
                <p>Budgets passed</p>
            </div>
            <div class="summary-card">
                <h3>Issues</h3>
                <div class="metric ${this.results.summary.highSeverityIssues > 0 ? 'text-danger' : 'text-success'}">${this.results.summary.recommendations}</div>
                <p>${this.results.summary.highSeverityIssues} high severity</p>
            </div>
        </div>

        <div class="budgets">
            <h2>📊 Performance Budgets</h2>
            ${Object.entries(this.results.budgetResults).map(([type, result]) => `
                <div class="budget-item ${result.passed ? 'budget-pass' : 'budget-fail'}">
                    <div>
                        <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong><br>
                        <small>${result.formatted.actual} / ${result.formatted.budget}</small>
                    </div>
                    <div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.min(result.usage, 100)}%; background: ${result.passed ? '#28a745' : '#dc3545'};"></div>
                        </div>
                        <small>${result.usage}%</small>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="assets-breakdown">
            <h2>📁 Assets by Type</h2>
            ${assetsByTypeEntries.map(([type, data]) => `
                <div style="margin-bottom: 30px;">
                    <h3>${type.charAt(0).toUpperCase() + type.slice(1)} (${data.count} files, ${this.formatBytes(data.totalSize)})</h3>
                    <table class="assets-table">
                        <thead>
                            <tr>
                                <th>File</th>
                                <th>Size</th>
                                <th>Gzipped</th>
                                <th>Path</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.files.slice(0, 10).map(file => `
                                <tr>
                                    <td>${file.filename}</td>
                                    <td class="file-size">${file.sizeFormatted}</td>
                                    <td class="file-size">${file.gzipSize ? this.formatBytes(file.gzipSize) : 'N/A'}</td>
                                    <td><small>${file.path}</small></td>
                                </tr>
                            `).join('')}
                            ${data.files.length > 10 ? `<tr><td colspan="4"><em>... and ${data.files.length - 10} more files</em></td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            `).join('')}
        </div>

        ${this.results.recommendations.length > 0 ? `
            <div class="recommendations">
                <h2>💡 Recommendations</h2>
                ${this.results.recommendations.map(rec => `
                    <div class="rec-item severity-${rec.severity}">
                        <h4>${rec.title}</h4>
                        <p>${rec.description}</p>
                        <ul>
                            ${rec.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    </div>
</body>
</html>`;
  }

  // Utility functions
  convertToBytes(value, unit) {
    const units = { B: 1, kB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    return Math.round(value * (units[unit] || 1));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'kB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const typeMap = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'javascript',
      '.tsx': 'javascript',
      '.css': 'css',
      '.scss': 'css',
      '.sass': 'css',
      '.less': 'css',
      '.html': 'html',
      '.htm': 'html',
      '.json': 'json',
      '.txt': 'text',
      '.md': 'text',
      '.jpg': 'images',
      '.jpeg': 'images',
      '.png': 'images',
      '.gif': 'images',
      '.svg': 'images',
      '.webp': 'images',
      '.ico': 'images',
      '.woff': 'fonts',
      '.woff2': 'fonts',
      '.ttf': 'fonts',
      '.eot': 'fonts',
      '.otf': 'fonts',
    };
    return typeMap[ext] || 'other';
  }
}

// Main execution function
async function runBundleAnalysis() {
  const analyzer = new BundleAnalyzer();
  
  try {
    const results = await analyzer.analyze();
    
    console.log('\n📦 Bundle Analysis Results:');
    console.log('================================');
    console.log(`Total Bundle Size: ${results.summary.totalSizeFormatted}`);
    console.log(`Compressed Size: ${results.summary.totalGzipSizeFormatted} (${results.summary.compressionRatio}% compression)`);
    console.log(`Total Assets: ${results.summary.totalAssets}`);
    console.log(`Budget Status: ${results.summary.budgetsPassed}/${results.summary.totalBudgets} passed`);
    console.log(`Recommendations: ${results.summary.recommendations} (${results.summary.highSeverityIssues} high severity)`);
    console.log(`Overall Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);

    return results;
    
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runBundleAnalysis().then(results => {
    process.exit(results.passed ? 0 : 1);
  });
}

module.exports = { BundleAnalyzer, runBundleAnalysis };