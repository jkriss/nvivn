# nvivn

🚨 Warning: early and experimental 🚨

More at [nvivn.io](https://nvivn.io).

## Installation

    npm install
    npm link

## Running

Run `nivin -h` to see all the options.

## Setting a profile

After running `nvivn login <username>` to create a profile, you can set that
profile via the `NVIVN_PROFILE` environment variable, which will always apply,
regardless of the `-u` or `--username` options.

## Examples

    nvivn create hi
    nvivn post hi
    nvivn login someuser # pick a really strong password
    nvivn post hi -u someuser
    nvivn post hi -u someuser | nvivn verify -
