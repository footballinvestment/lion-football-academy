module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // HTML5-QRCode source map figyelmeztetések figyelmen kívül hagyása
      webpackConfig.ignoreWarnings = [
        function ignoreSourcemapsloaderWarnings(warning) {
          return (
            warning.module &&
            warning.module.resource.includes('node_modules') &&
            warning.details &&
            warning.details.includes('source-map-loader')
          );
        }
      ];
      
      // Source-map-loader konfigurálása
      const sourceMapRule = {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        enforce: 'pre',
        use: [
          {
            loader: 'source-map-loader',
            options: {
              filterSourceMappingUrl: (url, resourcePath) => {
                if (/html5-qrcode/i.test(resourcePath)) {
                  return false;
                }
                return true;
              }
            }
          }
        ],
        exclude: [/node_modules\/html5-qrcode/]
      };
      
      webpackConfig.module.rules.unshift(sourceMapRule);
      
      // Production optimalizációk
      if (env === 'production') {
        // Bundle splitting optimalizáció
        webpackConfig.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            // React & ReactDOM külön chunk
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20
            },
            // Bootstrap és UI könyvtárak
            ui: {
              test: /[\\/]node_modules[\\/](bootstrap|react-bootstrap)[\\/]/,
              name: 'ui-framework',
              chunks: 'all',
              priority: 15
            },
            // QR könyvtárak
            qr: {
              test: /[\\/]node_modules[\\/](react-qr-code|react-qr-reader)[\\/]/,
              name: 'qr-libraries',
              chunks: 'all',
              priority: 10
            },
            // Összes többi vendor
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 5,
              minChunks: 1
            }
          }
        };
        
        // Gzip tömörítés engedélyezése
        webpackConfig.optimization.minimize = true;
      }
      
      return webpackConfig;
    }
  }
};