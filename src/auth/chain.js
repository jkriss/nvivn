const chain = (...customLogicObjs) => {
  // if there are things other than isAllowed, chain those too
  return {
    isAllowed: async function({ command, userPublicKey, trustedKeys }) {
      let result
      for (const customLogic of customLogicObjs) {
        if (!customLogic.isAllowed) continue
        console.log('running custom logic:', customLogic)
        result = await customLogic.isAllowed.bind(this)({
          command,
          userPublicKey,
          trustedKeys,
        })
        if (result === false) break
      }
      return result
    },
    ready: server => {
      for (const customLogic of customLogicObjs) {
        if (customLogic.ready) customLogic.ready(server)
      }
    },
  }
}

module.exports = chain
