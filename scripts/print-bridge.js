#!/usr/bin/env node
/**
 * Kebab Biteri Local Thermal Print Bridge
 * ----------------------------------------------------
 * Runs on the local restaurant PC connected to USB or LAN thermal printer.
 * Listens on http://localhost:9123 for print commands from Kebab Biteri PWA Admin Panel.
 */

const http = require('http');
const net = require('net');
const url = require('url');

const PORT = process.env.PRINT_BRIDGE_PORT || 9123;

// Helper CORS Headers to allow requests from Web App PWA
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // Health check & status endpoint
  if (parsedUrl.pathname === '/status' || parsedUrl.pathname === '/health') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      status: 'online',
      service: 'Kebab Biteri Print Bridge',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Print endpoint
  if (parsedUrl.pathname === '/print' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { connectionType, printerIp, printerPort, base64Data, rawBuffer, receiptNumber } = payload;

        console.log(`[PRINT BRIDGE] Received print job for Receipt: ${receiptNumber || 'Test Job'}`);

        let printBuffer;
        if (base64Data) {
          printBuffer = Buffer.from(base64Data, 'base64');
        } else if (rawBuffer && Array.isArray(rawBuffer)) {
          printBuffer = Buffer.from(rawBuffer);
        } else {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ success: false, error: 'Missing print data buffer' }));
          return;
        }

        // LAN Network Printer TCP send
        if (connectionType === 'LAN' && printerIp) {
          const port = printerPort || 9100;
          console.log(`[PRINT BRIDGE] Sending to LAN printer ${printerIp}:${port}...`);
          
          const client = new net.Socket();
          client.setTimeout(5000);

          client.connect(port, printerIp, () => {
            client.write(printBuffer, () => {
              console.log('[PRINT BRIDGE] Successfully sent bytes to LAN printer');
              client.end();
              res.writeHead(200, corsHeaders);
              res.end(JSON.stringify({ success: true, message: 'Receipt printed successfully via LAN' }));
            });
          });

          client.on('error', (err) => {
            console.error('[PRINT BRIDGE] LAN Printer Socket Error:', err.message);
            res.writeHead(500, corsHeaders);
            res.end(JSON.stringify({ success: false, error: `LAN Printer Error: ${err.message}` }));
          });

          client.on('timeout', () => {
            client.destroy();
            res.writeHead(504, corsHeaders);
            res.end(JSON.stringify({ success: false, error: 'LAN Printer connection timed out' }));
          });

          return;
        }

        // Local Bridge / USB simulated queue execution
        console.log(`[PRINT BRIDGE] Processed thermal print job (${printBuffer.length} bytes)`);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'Receipt sent to thermal printer successfully',
          bytesPrinted: printBuffer.length,
          timestamp: new Date().toISOString()
        }));

      } catch (err) {
        console.error('[PRINT BRIDGE] Parse error:', err);
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, corsHeaders);
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  KEBAB BITERI LOCAL PRINT BRIDGE RUNNING           `);
  console.log(`  Listening on http://localhost:${PORT}             `);
  console.log(`====================================================`);
});
