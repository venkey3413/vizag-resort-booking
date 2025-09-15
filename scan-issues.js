const fs = require('fs');
const path = require('path');

function scanFile(filePath) {
    console.log(`\n🔍 Scanning: ${filePath}`);
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        let issues = [];
        
        // Check for non-ASCII characters
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;
            
            // Check for non-ASCII characters
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const charCode = char.charCodeAt(0);
                
                if (charCode > 127) {
                    issues.push({
                        type: 'NON_ASCII',
                        line: lineNum,
                        column: j + 1,
                        char: char,
                        charCode: charCode,
                        context: line.substring(Math.max(0, j-10), j+10)
                    });
                }
            }
            
            // Check for HTML entities that might be malformed
            const entityMatches = line.match(/&[a-zA-Z0-9#]+;?/g);
            if (entityMatches) {
                entityMatches.forEach(entity => {
                    if (!entity.endsWith(';')) {
                        issues.push({
                            type: 'MALFORMED_ENTITY',
                            line: lineNum,
                            entity: entity,
                            context: line.trim()
                        });
                    }
                });
            }
            
            // Check for stray < or > characters
            const strayMatches = line.match(/[<>]/g);
            if (strayMatches) {
                const tagMatches = line.match(/<[^>]*>/g) || [];
                const entityMatches = line.match(/&[lg]t;/g) || [];
                
                if (strayMatches.length > (tagMatches.join('').match(/[<>]/g) || []).length + entityMatches.length) {
                    issues.push({
                        type: 'STRAY_BRACKETS',
                        line: lineNum,
                        context: line.trim()
                    });
                }
            }
            
            // Check for script tags with potential issues
            if (line.includes('<script')) {
                const scriptMatch = line.match(/<script[^>]*>(.*?)<\/script>/);
                if (scriptMatch && scriptMatch[1].trim()) {
                    const scriptContent = scriptMatch[1];
                    // Check for common JS syntax issues
                    if (scriptContent.includes('&lt;') || scriptContent.includes('&gt;')) {
                        issues.push({
                            type: 'ENCODED_SCRIPT',
                            line: lineNum,
                            context: line.trim()
                        });
                    }
                }
            }
        }
        
        // Check file encoding
        const buffer = fs.readFileSync(filePath);
        const hasBOM = buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
        
        if (hasBOM) {
            issues.push({
                type: 'UTF8_BOM',
                message: 'File has UTF-8 BOM which can cause issues'
            });
        }
        
        // Report results
        if (issues.length === 0) {
            console.log('✅ No issues found');
        } else {
            console.log(`❌ Found ${issues.length} issues:`);
            issues.forEach((issue, index) => {
                console.log(`\n${index + 1}. ${issue.type}:`);
                switch (issue.type) {
                    case 'NON_ASCII':
                        console.log(`   Line ${issue.line}, Column ${issue.column}: '${issue.char}' (code: ${issue.charCode})`);
                        console.log(`   Context: "${issue.context}"`);
                        break;
                    case 'MALFORMED_ENTITY':
                        console.log(`   Line ${issue.line}: ${issue.entity}`);
                        console.log(`   Context: "${issue.context}"`);
                        break;
                    case 'STRAY_BRACKETS':
                        console.log(`   Line ${issue.line}: Potential stray < or >`);
                        console.log(`   Context: "${issue.context}"`);
                        break;
                    case 'ENCODED_SCRIPT':
                        console.log(`   Line ${issue.line}: Script contains HTML entities`);
                        console.log(`   Context: "${issue.context}"`);
                        break;
                    case 'UTF8_BOM':
                        console.log(`   ${issue.message}`);
                        break;
                }
            });
        }
        
        return issues;
        
    } catch (error) {
        console.log(`❌ Error reading file: ${error.message}`);
        return [];
    }
}

// Scan all HTML files
const htmlFiles = [
    'public/index.html',
    'admin-public/index.html',
    'booking-public/index.html'
];

console.log('🔍 Scanning HTML files for encoding issues and stray characters...\n');

let totalIssues = 0;
htmlFiles.forEach(file => {
    const issues = scanFile(file);
    totalIssues += issues.length;
});

console.log(`\n📊 Summary: Found ${totalIssues} total issues across all files`);

if (totalIssues === 0) {
    console.log('✅ All HTML files look clean!');
} else {
    console.log('\n🔧 Recommended fixes:');
    console.log('1. Remove any non-ASCII characters or replace with HTML entities');
    console.log('2. Fix malformed HTML entities (add missing semicolons)');
    console.log('3. Escape stray < and > characters as &lt; and &gt;');
    console.log('4. Remove UTF-8 BOM if present');
    console.log('5. Fix any encoded content in script tags');
}