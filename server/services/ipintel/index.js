// Node
const { URL } = require('url')
// 3rd
const assert = require('better-assert')
const fetch = require('node-fetch')
// 1st
const { broadcastIpAddressAutoNuke } = require('../discord')
const { timeout } = require('../../belt')
const db = require('../../db')
const config = require('../../config')

// For testing, here are some bad ip addrs:
//
// 104.223.123.98

class IntelClient {
    // ApiResult = 'GOOD' | 'BAD' | 'API_TIMEOUT' | 'API_ERROR'
    // Returns Promise<ApiResult>
    async checkIpAddress(ipAddress) {
        assert(typeof ipAddress === 'string')

        return Promise.race([
            timeout(5000).then(() => 'API_TIMEOUT'),
            this._request(ipAddress),
        ])
    }

    // Returns Promise<ApiResult>
    async _request(ipAddress) {
        assert(typeof ipAddress === 'string')

        // Ensure works with ipv6 since it's not url-encoded
        const url = [
            'http://check.getipintel.net/check.php',
            '?ip=',
            ipAddress,
            '&contact=',
            'danrodneu@gmail.com',
            '&flags=',
            'm',
            '&format=',
            'json',
        ].join('')

        console.log(`[ipintel] fetching url "${url}"...`)

        let body

        try {
            body = await fetch(url).then(res => res.json())
        } catch (err) {
            console.error(`[ipintel] Error fetching "${url}":`, err)
            return 'API_ERROR'
        }

        if (body.status !== 'success') {
            console.error(
                `[ipintel] "${url}" replied with unsuccessful body:`,
                body
            )
            return 'API_ERROR'
        }

        const confidence = Number.parseFloat(body.result)

        console.log(
            `[ipintel] "${url}" responded with confidence=${confidence}`
        )

        return confidence >= 0.95 ? 'BAD' : 'GOOD'
    }
}

////////////////////////////////////////////////////////////

// Use singleton for now
const client = new IntelClient()

module.exports = {
    process: async (ipAddress, user) => {
        assert(typeof ipAddress === 'string')
        assert(typeof user.uname === 'string')

        const result = await client.checkIpAddress(ipAddress)
        console.log(
            `[ipintel#process] uname="${user.uname}" checkIpAddress("${
                ipAddress
            }") = "${result}"`
        )
        if (result === 'BAD') {
            await db.nukeUser({
                spambot: user.id,
                nuker: config.STAFF_REPRESENTATIVE_ID || 1,
            })

            await broadcastIpAddressAutoNuke(user, ipAddress)
        }
    },
}
